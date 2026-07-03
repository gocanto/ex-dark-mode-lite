import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { PackageStoreError } from '#scripts/package-store/domain/package-store-error';

/**
 * Reads JSON files from the local checkout.
 */
export class NodeJsonReader {
	private readonly repoRoot: string;

	/**
	 * Create a JSON reader that reports paths relative to the repo root.
	 *
	 * @param repoRoot - Absolute repository root.
	 */
	constructor(repoRoot: string) {
		this.repoRoot = repoRoot;
	}

	/**
	 * Read a JSON file that must contain an object.
	 *
	 * @param path - Absolute JSON file path.
	 * @returns Parsed JSON object.
	 */
	readObject(path: string) {
		const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

		if (!this.isRecord(parsed)) {
			throw new PackageStoreError(`${relative(this.repoRoot, path)} must contain a JSON object.`);
		}

		return parsed;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}
}
