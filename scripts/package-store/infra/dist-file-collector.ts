import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Lists package files below a dist-like directory in stable archive order.
 */
export class DistFileCollector {
	/**
	 * Collect all regular files below a root directory.
	 *
	 * @param root - Absolute directory to scan.
	 * @returns Root-relative file paths sorted by locale.
	 */
	async list(root: string) {
		const files: string[] = [];

		await this.collect(root, '', files);

		return files.sort((left, right) => left.localeCompare(right));
	}

	private async collect(root: string, directory: string, files: string[]) {
		const entries = await readdir(join(root, directory), { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = join(directory, entry.name);

			if (entry.isDirectory()) {
				await this.collect(root, entryPath, files);

				continue;
			}

			if (entry.isFile()) {
				files.push(entryPath);
			}
		}
	}
}
