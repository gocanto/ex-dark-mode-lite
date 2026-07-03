import { PackageStoreError } from '#scripts/package-store/domain/package-store-error';

const REQUIRED_DIST_FILES = ['manifest.json', 'popup/index.html', 'src/content.js', 'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png'];
const REQUIRED_PERMISSIONS = ['activeTab', 'scripting', 'storage'];
const BROAD_HOST_PERMISSIONS = ['http://*/*', 'https://*/*'];

const EXPECTED_ICONS: Record<string, string> = {
	16: 'icons/icon-16.png',
	32: 'icons/icon-32.png',
	48: 'icons/icon-48.png',
	128: 'icons/icon-128.png',
};

/**
 * Chrome Web Store package rules for the built extension.
 */
export class StorePackagePolicy {
	/**
	 * Ensure the built dist directory contains all required store files.
	 *
	 * @param files - Dist-relative files found in the built extension.
	 */
	assertRequiredDistFiles(files: ReadonlyArray<string>) {
		for (const file of REQUIRED_DIST_FILES) {
			if (!files.includes(file)) {
				throw new PackageStoreError(`Missing required package file: dist/${file}`);
			}
		}
	}

	/**
	 * Ensure the built manifest still matches the approved store package shape.
	 *
	 * @param manifest - Parsed `dist/manifest.json`.
	 */
	assertManifest(manifest: Record<string, unknown>) {
		this.assertStringField(manifest, 'name', 'Dark Mode - Lite');
		this.assertStringField(manifest, 'description', 'A compact dark-mode extension made by gocanto.sh with Vue and Tailwind CSS.');
		this.assertStringField(manifest, 'homepage_url', 'https://github.com/gocanto/ex-dark-mode-lite');
		this.assertNumberField(manifest, 'manifest_version', 3);
		this.assertArrayField(manifest, 'permissions', REQUIRED_PERMISSIONS);
		this.assertArrayField(manifest, 'host_permissions', BROAD_HOST_PERMISSIONS);
		this.assertIcons(manifest);

		const permissions = this.getRequiredStringArray(manifest, 'permissions', 'dist/manifest.json');

		if (permissions.includes('tabs')) {
			throw new PackageStoreError('The tabs permission is not allowed in the store package; activeTab covers the popup flow.');
		}
	}

	/**
	 * Read the manifest version field after manifest validation.
	 *
	 * @param manifest - Parsed `dist/manifest.json`.
	 * @returns The manifest version string.
	 */
	getManifestVersion(manifest: Record<string, unknown>) {
		return this.getRequiredString(manifest, 'version', 'dist/manifest.json');
	}

	private assertIcons(manifest: Record<string, unknown>) {
		const icons = this.getRequiredObject(manifest, 'icons', 'dist/manifest.json');
		const action = this.getRequiredObject(manifest, 'action', 'dist/manifest.json');
		const defaultIcon = this.getRequiredObject(action, 'default_icon', 'dist/manifest.json action');

		for (const [size, iconPath] of Object.entries(EXPECTED_ICONS)) {
			this.assertStringField(icons, size, iconPath);
			this.assertStringField(defaultIcon, size, iconPath);
		}
	}

	private assertStringField(record: Record<string, unknown>, key: string, expected: string) {
		const actual = this.getRequiredString(record, key, key);

		if (actual !== expected) {
			throw new PackageStoreError(`Expected ${key} to be ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
		}
	}

	private assertNumberField(record: Record<string, unknown>, key: string, expected: number) {
		const actual = record[key];

		if (actual !== expected) {
			throw new PackageStoreError(`Expected ${key} to be ${expected}, received ${JSON.stringify(actual)}.`);
		}
	}

	private assertArrayField(record: Record<string, unknown>, key: string, expectedValues: ReadonlyArray<string>) {
		const actual = this.getRequiredStringArray(record, key, key);
		const missing = expectedValues.filter((value) => !actual.includes(value));

		if (missing.length > 0) {
			throw new PackageStoreError(`Expected ${key} to include: ${missing.join(', ')}`);
		}
	}

	private getRequiredObject(record: Record<string, unknown>, key: string, source: string) {
		const value = record[key];

		if (!this.isRecord(value)) {
			throw new PackageStoreError(`${source} is missing object field: ${key}`);
		}

		return value;
	}

	private getRequiredString(record: Record<string, unknown>, key: string, source: string) {
		const value = record[key];

		if (typeof value !== 'string' || value.length === 0) {
			throw new PackageStoreError(`${source} is missing string field: ${key}`);
		}

		return value;
	}

	private getRequiredStringArray(record: Record<string, unknown>, key: string, source: string) {
		const value = record[key];

		if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
			throw new PackageStoreError(`${source} is missing string array field: ${key}`);
		}

		return value;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}
}
