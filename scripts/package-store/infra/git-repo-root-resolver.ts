import { PackageStoreError } from '#scripts/package-store/domain/package-store-error';
import type { NodeCommandRunner } from '#scripts/package-store/infra/node-command-runner';

/**
 * Resolves the current Git repository root.
 */
export class GitRepoRootResolver {
	private readonly commandRunner: NodeCommandRunner;

	/**
	 * Create a Git-backed repo root resolver.
	 *
	 * @param commandRunner - Command runner used to invoke Git.
	 */
	constructor(commandRunner: NodeCommandRunner) {
		this.commandRunner = commandRunner;
	}

	/**
	 * Resolve the absolute repository root for the current working tree.
	 *
	 * @returns The absolute repo root path.
	 */
	resolve() {
		const repoRoot = this.commandRunner.capture('git', ['rev-parse', '--show-toplevel']).trim();

		if (repoRoot.length === 0) {
			throw new PackageStoreError('package:store: failed to resolve repo root');
		}

		return repoRoot;
	}
}
