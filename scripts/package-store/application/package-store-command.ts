import { resolve } from 'node:path';
import { PackageName } from '#scripts/package-store/domain/package-name';
import type { StorePackagePolicy } from '#scripts/package-store/domain/store-package-policy';
import type { DistFileCollector } from '#scripts/package-store/infra/dist-file-collector';
import type { NodeCommandRunner } from '#scripts/package-store/infra/node-command-runner';
import type { NodeJsonReader } from '#scripts/package-store/infra/node-json-reader';
import type { ZipStorePackageWriter } from '#scripts/package-store/infra/zip-store-package-writer';

/**
 * Dependencies and configuration for the package-store CLI command.
 */
export type PackageStoreCommandInput = {
	readonly repoRoot: string;
	readonly releasesDir: string;
	readonly commandRunner: NodeCommandRunner;
	readonly jsonReader: NodeJsonReader;
	readonly fileCollector: DistFileCollector;
	readonly packagePolicy: StorePackagePolicy;
	readonly packageWriter: ZipStorePackageWriter;
};

/**
 * Orchestrates build validation and Chrome Web Store package creation.
 */
export class PackageStoreCommand {
	private readonly input: PackageStoreCommandInput;

	/**
	 * Create the package-store command.
	 *
	 * @param input - Command dependencies and paths.
	 */
	constructor(input: PackageStoreCommandInput) {
		this.input = input;
	}

	/**
	 * Build the extension, validate dist, and write the store package.
	 */
	async run() {
		const distRoot = resolve(this.input.repoRoot, 'dist');

		this.input.commandRunner.run('pnpm', ['run', 'build'], this.input.repoRoot);

		const distFiles = await this.input.fileCollector.list(distRoot);

		this.input.packagePolicy.assertRequiredDistFiles(distFiles);

		const manifest = this.input.jsonReader.readObject(resolve(distRoot, 'manifest.json'));

		this.input.packagePolicy.assertManifest(manifest);

		const version = this.input.packagePolicy.getManifestVersion(manifest);
		const packageJson = this.input.jsonReader.readObject(resolve(this.input.repoRoot, 'package.json'));
		const packageName = PackageName.fromPackageJson(packageJson);
		const zipPath = resolve(this.input.releasesDir, `${packageName.toString()}-${version}.zip`);

		await this.input.packageWriter.write({
			sourceDistRoot: distRoot,
			zipPath,
			repoRoot: this.input.repoRoot,
		});

		process.stdout.write(`Chrome Web Store package created: ${zipPath}\n`);
		process.stdout.write(`Package contents: ${zipPath}.contents.txt\n`);
	}
}
