import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const REQUIRED_DIST_FILES = ['manifest.json', 'popup/index.html', 'src/content.js', 'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png'];

// dist paths that Vite copies from public/ but must not ship in the store zip.
const PACKAGE_EXCLUDED_PATHS = ['store-assets'];

const REQUIRED_PERMISSIONS = ['activeTab', 'scripting', 'storage'];
const BROAD_HOST_PERMISSIONS = ['http://*/*', 'https://*/*'];
const RELEASES_DIR = '/Users/gocanto/.cache/codex/ex-dark-mode-lite/releases';
const NORMALIZED_ARCHIVE_TIME = new Date('2026-01-01T00:00:00Z');
const repoRoot = resolveRepoRoot();
const distRoot = resolve(repoRoot, 'dist');

run('pnpm', ['run', 'build'], repoRoot);
validateDist();

const manifest = readJsonObject(resolve(distRoot, 'manifest.json'));
const version = getRequiredString(manifest, 'version', 'dist/manifest.json');
const packageName = getPackageName();
const zipPath = resolve(RELEASES_DIR, `${packageName}-${version}.zip`);

await createStorePackage(zipPath);

process.stdout.write(`Chrome Web Store package created: ${zipPath}\n`);
process.stdout.write(`Package contents: ${zipPath}.contents.txt\n`);

function resolveRepoRoot() {
	const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
		encoding: 'utf8',
	});

	if (result.status !== 0) {
		fail(result.stderr || 'package:store: failed to resolve repo root');
	}

	return result.stdout.trim();
}

function validateDist() {
	for (const file of REQUIRED_DIST_FILES) {
		const path = resolve(distRoot, file);

		if (!existsSync(path)) {
			fail(`Missing required package file: dist/${file}`);
		}
	}

	const manifest = readJsonObject(resolve(distRoot, 'manifest.json'));

	assertStringField(manifest, 'name', 'Dark Mode - Lite');
	assertStringField(manifest, 'description', 'A compact dark-mode extension built with Vue and Tailwind CSS.');
	assertNumberField(manifest, 'manifest_version', 3);
	assertArrayField(manifest, 'permissions', REQUIRED_PERMISSIONS);
	assertArrayField(manifest, 'host_permissions', BROAD_HOST_PERMISSIONS);
	assertIcons(manifest);

	const permissions = getRequiredStringArray(manifest, 'permissions', 'dist/manifest.json');

	if (permissions.includes('tabs')) {
		fail('The tabs permission is not allowed in the store package; activeTab covers the popup flow.');
	}
}

function assertIcons(manifest: Record<string, unknown>) {
	const icons = getRequiredObject(manifest, 'icons', 'dist/manifest.json');
	const action = getRequiredObject(manifest, 'action', 'dist/manifest.json');
	const defaultIcon = getRequiredObject(action, 'default_icon', 'dist/manifest.json action');

	const expectedIcons: Record<string, string> = {
		16: 'icons/icon-16.png',
		32: 'icons/icon-32.png',
		48: 'icons/icon-48.png',
		128: 'icons/icon-128.png',
	};

	for (const [size, iconPath] of Object.entries(expectedIcons)) {
		assertStringField(icons, size, iconPath);
		assertStringField(defaultIcon, size, iconPath);
	}
}

async function createStorePackage(zipPath: string) {
	mkdirSync(dirname(zipPath), { recursive: true });
	rmSync(zipPath, { force: true });
	rmSync(`${zipPath}.contents.txt`, { force: true });

	const stagingRoot = await mkdtemp(join(tmpdir(), 'dark-mode-lite-store-'));

	const stagedDist = join(stagingRoot, 'dist');

	try {
		await cp(distRoot, stagedDist, { recursive: true });

		// Vite copies public/ verbatim into dist/, which pulls in the store
		// listing / marketing sources under public/store-assets. Those are not
		// part of the shipped extension, so strip them from the staged copy
		// before zipping to keep the uploaded package lean.
		for (const excluded of PACKAGE_EXCLUDED_PATHS) {
			await rm(join(stagedDist, excluded), { recursive: true, force: true });
		}

		const files = await listFiles(stagedDist);

		for (const file of files) {
			utimesSync(join(stagedDist, file), NORMALIZED_ARCHIVE_TIME, NORMALIZED_ARCHIVE_TIME);
		}

		run('zip', ['-X', '-q', zipPath, ...files], stagedDist);
		run('unzip', ['-Z1', zipPath], repoRoot, `${zipPath}.contents.txt`);
	} finally {
		await rm(stagingRoot, { recursive: true, force: true });
	}
}

async function listFiles(root: string) {
	const files: string[] = [];

	await collectFiles(root, '', files);

	return files.sort((left, right) => left.localeCompare(right));
}

async function collectFiles(root: string, directory: string, files: string[]) {
	const entries = await readdir(join(root, directory), { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			await collectFiles(root, entryPath, files);

			continue;
		}

		if (entry.isFile()) {
			files.push(entryPath);
		}
	}
}

function getPackageName() {
	const packageJson = readJsonObject(resolve(repoRoot, 'package.json'));
	const name = getRequiredString(packageJson, 'name', 'package.json');

	return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function readJsonObject(path: string) {
	const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

	if (!isRecord(parsed)) {
		fail(`${relative(repoRoot, path)} must contain a JSON object.`);
	}

	return parsed;
}

function assertStringField(record: Record<string, unknown>, key: string, expected: string) {
	const actual = getRequiredString(record, key, key);

	if (actual !== expected) {
		fail(`Expected ${key} to be ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
	}
}

function assertNumberField(record: Record<string, unknown>, key: string, expected: number) {
	const actual = record[key];

	if (actual !== expected) {
		fail(`Expected ${key} to be ${expected}, received ${JSON.stringify(actual)}.`);
	}
}

function assertArrayField(record: Record<string, unknown>, key: string, expectedValues: ReadonlyArray<string>) {
	const actual = getRequiredStringArray(record, key, key);
	const missing = expectedValues.filter((value) => !actual.includes(value));

	if (missing.length > 0) {
		fail(`Expected ${key} to include: ${missing.join(', ')}`);
	}
}

function getRequiredObject(record: Record<string, unknown>, key: string, source: string) {
	const value = record[key];

	if (!isRecord(value)) {
		fail(`${source} is missing object field: ${key}`);
	}

	return value;
}

function getRequiredString(record: Record<string, unknown>, key: string, source: string) {
	const value = record[key];

	if (typeof value !== 'string' || value.length === 0) {
		fail(`${source} is missing string field: ${key}`);
	}

	return value;
}

function getRequiredStringArray(record: Record<string, unknown>, key: string, source: string) {
	const value = record[key];

	if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
		fail(`${source} is missing string array field: ${key}`);
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function run(command: string, args: ReadonlyArray<string>, cwd: string, outputPath?: string) {
	const result = spawnSync(command, [...args], {
		cwd,
		encoding: 'utf8',
		stdio: outputPath === undefined ? 'inherit' : 'pipe',
	});

	if (result.status !== 0) {
		fail(result.stderr || `${command} ${args.join(' ')} failed`);
	}

	if (outputPath !== undefined) {
		mkdirSync(dirname(outputPath), { recursive: true });

		const output = result.stdout;

		if (output.length === 0) {
			fail(`${command} ${args.join(' ')} did not produce output.`);
		}

		requireExistingParent(outputPath);
		writeFileSync(outputPath, output);
	}
}

function requireExistingParent(path: string) {
	const parent = dirname(path);

	if (!existsSync(parent) || !statSync(parent).isDirectory()) {
		fail(`Missing output directory: ${parent}`);
	}
}

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}
