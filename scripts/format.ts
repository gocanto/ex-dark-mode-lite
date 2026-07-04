import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const FMT_IMAGE = 'ghcr.io/oullin/go-fmt:v0.4.3';
const FILE_GLOBS = ['*.ts', '*.tsx', '*.vue', '*.mts', '*.cts'];
const BATCH_SIZE = 400;

const selections: Record<string, string[]> = {
	changed: ['--others', '--modified'],
	all: ['--cached', '--others'],
};

const mode = process.argv[2] ?? '';
const selection = selections[mode];

if (selection === undefined) {
	process.stderr.write(`format: unknown mode '${mode}' (expected changed | all)\n`);
	process.exit(1);
}

const rootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {
	encoding: 'utf8',
});

if (rootResult.status !== 0) {
	process.stderr.write(rootResult.stderr || 'format: failed to resolve repo root\n');
	process.exit(rootResult.status ?? 1);
}

const repoRoot = rootResult.stdout.trim();

const listed = spawnSync('git', ['ls-files', '-z', ...selection, '--exclude-standard', '--', ...FILE_GLOBS], { cwd: repoRoot, encoding: 'utf8' });

if (listed.status !== 0) {
	process.stderr.write(listed.stderr || 'format: git ls-files failed\n');
	process.exit(listed.status ?? 1);
}

const files = listed.stdout
	.split('\0')
	.filter((file) => file.length > 0)
	.filter((file) => existsSync(resolve(repoRoot, file)));

if (files.length === 0) {
	process.stdout.write('No TS/Vue files to format.\n');
	process.exit(0);
}

const uid = process.getuid?.() ?? 0;
const gid = process.getgid?.() ?? 0;

const dockerBase = ['run', '--rm', '--user', `${uid}:${gid}`, '-v', `${repoRoot}:/work`, '-w', '/work', '-e', `HOST_PROJECT_PATH=${repoRoot}`, FMT_IMAGE, 'format'];

for (let start = 0; start < files.length; start += BATCH_SIZE) {
	const batch = files.slice(start, start + BATCH_SIZE);

	const result = spawnSync('docker', [...dockerBase, ...batch], {
		cwd: repoRoot,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}
