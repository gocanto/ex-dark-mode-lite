import { resolve } from 'node:path';
import { PackageStoreCommand } from '#scripts/package-store/application/package-store-command';
import { PackageStoreError } from '#scripts/package-store/domain/package-store-error';
import { StorePackagePolicy } from '#scripts/package-store/domain/store-package-policy';
import { DistFileCollector } from '#scripts/package-store/infra/dist-file-collector';
import { GitRepoRootResolver } from '#scripts/package-store/infra/git-repo-root-resolver';
import { NodeCommandRunner } from '#scripts/package-store/infra/node-command-runner';
import { NodeJsonReader } from '#scripts/package-store/infra/node-json-reader';
import { ZipStorePackageWriter } from '#scripts/package-store/infra/zip-store-package-writer';

const NORMALIZED_ARCHIVE_TIME = new Date('2026-01-01T00:00:00Z');

try {
	const commandRunner = new NodeCommandRunner();
	const repoRoot = new GitRepoRootResolver(commandRunner).resolve();
	const jsonReader = new NodeJsonReader(repoRoot);
	const fileCollector = new DistFileCollector();
	const releasesDir = process.env.STORE_RELEASES_DIR ?? resolve(repoRoot, 'release');

	const command = new PackageStoreCommand({
		repoRoot,
		releasesDir,
		commandRunner,
		jsonReader,
		fileCollector,
		packagePolicy: new StorePackagePolicy(),
		packageWriter: new ZipStorePackageWriter(fileCollector, commandRunner, NORMALIZED_ARCHIVE_TIME),
	});

	await command.run();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	const exitCode = error instanceof PackageStoreError ? error.exitCode : 1;

	process.stderr.write(`${message}\n`);
	process.exitCode = exitCode;
}
