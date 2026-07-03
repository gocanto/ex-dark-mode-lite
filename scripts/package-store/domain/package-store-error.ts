/**
 * Error raised for expected package-store command failures.
 */
export class PackageStoreError extends Error {
	readonly _tag = 'PackageStoreError';
	readonly exitCode: number;

	/**
	 * Create a package-store command error.
	 *
	 * @param message - Safe message to print to stderr.
	 * @param exitCode - Process exit code to use for the CLI.
	 */
	constructor(message: string, exitCode = 1) {
		super(message);
		this.name = 'PackageStoreError';
		this.exitCode = exitCode;
	}
}
