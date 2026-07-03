import { mkdirSync, rmSync, utimesSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { DistFileCollector } from '#scripts/package-store/infra/dist-file-collector';
import type { NodeCommandRunner } from '#scripts/package-store/infra/node-command-runner';

/**
 * Input required to write a Chrome Web Store archive.
 */
export type StorePackageWriteInput = {
	readonly sourceDistRoot: string;
	readonly zipPath: string;
	readonly repoRoot: string;
};

const PACKAGE_EXCLUDED_PATHS = ['store-assets'];
const TEMP_DIRECTORY_PREFIX = 'dark-mode-lite-store-';

/**
 * Creates the deterministic Chrome Web Store ZIP and contents listing.
 */
export class ZipStorePackageWriter {
	private readonly archiveTime: Date;
	private readonly commandRunner: NodeCommandRunner;
	private readonly fileCollector: DistFileCollector;

	/**
	 * Create a store package writer.
	 *
	 * @param fileCollector - Collector used to list staged archive files.
	 * @param commandRunner - Command runner used for `zip` and `unzip`.
	 * @param archiveTime - Timestamp applied to every archived file.
	 */
	constructor(fileCollector: DistFileCollector, commandRunner: NodeCommandRunner, archiveTime: Date) {
		this.fileCollector = fileCollector;
		this.commandRunner = commandRunner;
		this.archiveTime = archiveTime;
	}

	/**
	 * Stage the built dist directory, strip non-package assets, and write outputs.
	 *
	 * @param input - Package source and output paths.
	 */
	async write(input: StorePackageWriteInput) {
		mkdirSync(dirname(input.zipPath), { recursive: true });
		rmSync(input.zipPath, { force: true });
		rmSync(`${input.zipPath}.contents.txt`, { force: true });

		const stagingRoot = await mkdtemp(join(tmpdir(), TEMP_DIRECTORY_PREFIX));

		const stagedDist = join(stagingRoot, 'dist');

		try {
			await cp(input.sourceDistRoot, stagedDist, { recursive: true });

			for (const excluded of PACKAGE_EXCLUDED_PATHS) {
				await rm(join(stagedDist, excluded), { recursive: true, force: true });
			}

			const files = await this.fileCollector.list(stagedDist);

			for (const file of files) {
				utimesSync(join(stagedDist, file), this.archiveTime, this.archiveTime);
			}

			this.commandRunner.run('zip', ['-X', '-q', input.zipPath, ...files], stagedDist);
			this.commandRunner.writeOutput('unzip', ['-Z1', input.zipPath], input.repoRoot, `${input.zipPath}.contents.txt`);
		} finally {
			await rm(stagingRoot, { recursive: true, force: true });
		}
	}
}
