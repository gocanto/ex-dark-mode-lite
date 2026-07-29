import { copyFile, cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { parse, resolve } from 'node:path';
import { DistFileCollector } from '#scripts/package-store/infra/dist-file-collector';
import { GitRepoRootResolver } from '#scripts/package-store/infra/git-repo-root-resolver';
import { NodeCommandRunner } from '#scripts/package-store/infra/node-command-runner';
import { ZipStorePackageWriter } from '#scripts/package-store/infra/zip-store-package-writer';

const NORMALIZED_ARCHIVE_TIME = new Date('2026-01-01T00:00:00Z');
const BROWSER_FAMILIES = ['chromium', 'firefox'] as const;

const commandRunner = new NodeCommandRunner();
const repoRoot = new GitRepoRootResolver(commandRunner).resolve();
const extensionRoot = resolve(repoRoot, 'apps', 'extension');
const controllerRoot = resolve(repoRoot, 'apps', 'controller-extension');
const buildRoot = resolve(extensionRoot, 'controller-dist');
const releasesRoot = process.env.CONTROLLER_RELEASES_DIR ?? resolve(repoRoot, 'release', 'controller');
const resolvedReleasesRoot = resolve(releasesRoot);

if (resolvedReleasesRoot === parse(resolvedReleasesRoot).root) {
	throw new Error('Controller release output cannot be a filesystem root.');
}

await mkdir(resolvedReleasesRoot, { recursive: true });

for (const entry of await readdir(resolvedReleasesRoot)) {
	if (/^dark-mode-lite-controller-(?:chromium|firefox|safari)-\d+\.\d+\.\d+\.zip$/.test(entry)) {
		await rm(resolve(resolvedReleasesRoot, entry), { force: true });
	}
}

const fileCollector = new DistFileCollector();
const packageWriter = new ZipStorePackageWriter(fileCollector, commandRunner, NORMALIZED_ARCHIVE_TIME);

commandRunner.run('pnpm', ['run', 'build:controller'], repoRoot);

for (const browserFamily of BROWSER_FAMILIES) {
	const stageRoot = resolve(resolvedReleasesRoot, browserFamily);
	const manifestPath = resolve(controllerRoot, 'manifests', `${browserFamily}.json`);

	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

	const version = parseManifestVersion(manifest);

	await rm(stageRoot, { recursive: true, force: true });

	await mkdir(resolve(stageRoot, 'icons'), { recursive: true });

	await copyFile(resolve(buildRoot, 'background.js'), resolve(stageRoot, 'background.js'));

	await copyFile(resolve(buildRoot, 'content.js'), resolve(stageRoot, 'content.js'));

	await copyFile(manifestPath, resolve(stageRoot, 'manifest.json'));

	await cp(resolve(extensionRoot, 'public', 'icons'), resolve(stageRoot, 'icons'), { recursive: true });

	const zipPath = resolve(resolvedReleasesRoot, `dark-mode-lite-controller-${browserFamily}-${version}.zip`);

	await packageWriter.write({
		sourceDistRoot: stageRoot,
		zipPath,
		repoRoot,
	});

	process.stdout.write(`Controller extension package created: ${zipPath}\n`);
}

function parseManifestVersion(input: unknown) {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		throw new Error('Controller manifest must be a JSON object.');
	}

	const version = Reflect.get(input, 'version');

	if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
		throw new Error('Controller manifest version must use x.y.z format.');
	}

	return version;
}
