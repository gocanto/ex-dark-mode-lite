import { PackageStoreError } from '#scripts/package-store/domain/package-store-error';

/**
 * Sanitized package name used in Chrome Web Store archive filenames.
 */
export class PackageName {
	readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	/**
	 * Create a store package name from `package.json`.
	 *
	 * @param packageJson - Parsed package metadata.
	 * @returns A filesystem-safe package name.
	 */
	static fromPackageJson(packageJson: Record<string, unknown>) {
		const name = packageJson.name;

		if (typeof name !== 'string' || name.length === 0) {
			throw new PackageStoreError('package.json is missing string field: name');
		}

		return new PackageName(name.replace(/[^a-zA-Z0-9._-]/g, '-'));
	}

	/**
	 * Render the sanitized package name.
	 *
	 * @returns The filesystem-safe package name.
	 */
	toString() {
		return this.value;
	}
}
