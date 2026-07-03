import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PackageStoreError } from '#scripts/package-store/domain/package-store-error';

/**
 * Runs external commands needed by the package-store workflow.
 */
export class NodeCommandRunner {
	/**
	 * Run a command with inherited stdio.
	 *
	 * @param command - Executable name.
	 * @param args - Command arguments.
	 * @param cwd - Working directory.
	 */
	run(command: string, args: ReadonlyArray<string>, cwd: string) {
		const result = spawnSync(command, [...args], {
			cwd,
			encoding: 'utf8',
			stdio: 'inherit',
		});

		if (result.status !== 0) {
			throw new PackageStoreError(`${command} ${args.join(' ')} failed`, result.status ?? 1);
		}
	}

	/**
	 * Run a command and return stdout.
	 *
	 * @param command - Executable name.
	 * @param args - Command arguments.
	 * @param cwd - Optional working directory.
	 * @returns Captured stdout.
	 */
	capture(command: string, args: ReadonlyArray<string>, cwd?: string) {
		const result =
			cwd === undefined
				? spawnSync(command, [...args], { encoding: 'utf8' })
				: spawnSync(command, [...args], {
						cwd,
						encoding: 'utf8',
					});

		if (result.status !== 0) {
			throw new PackageStoreError(result.stderr || `${command} ${args.join(' ')} failed`, result.status ?? 1);
		}

		return result.stdout;
	}

	/**
	 * Run a command and write its stdout to a file.
	 *
	 * @param command - Executable name.
	 * @param args - Command arguments.
	 * @param cwd - Working directory.
	 * @param outputPath - File that receives stdout.
	 */
	writeOutput(command: string, args: ReadonlyArray<string>, cwd: string, outputPath: string) {
		const result = spawnSync(command, [...args], {
			cwd,
			encoding: 'utf8',
			stdio: 'pipe',
		});

		if (result.status !== 0) {
			throw new PackageStoreError(result.stderr || `${command} ${args.join(' ')} failed`, result.status ?? 1);
		}

		const output = result.stdout;

		if (output.length === 0) {
			throw new PackageStoreError(`${command} ${args.join(' ')} did not produce output.`);
		}

		mkdirSync(dirname(outputPath), { recursive: true });
		this.requireExistingParent(outputPath);
		writeFileSync(outputPath, output);
	}

	private requireExistingParent(path: string) {
		const parent = dirname(path);

		if (!existsSync(parent) || !statSync(parent).isDirectory()) {
			throw new PackageStoreError(`Missing output directory: ${parent}`);
		}
	}
}
