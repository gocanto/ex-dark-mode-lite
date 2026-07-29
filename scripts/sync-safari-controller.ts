import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/** Synchronizes the latest self-contained controller bundles into the Xcode target. */
class SafariControllerSynchronizer {
	private readonly root = process.cwd();
	private readonly resources = path.join(this.root, 'apps/macos/Dark Mode Lite/Dark Mode Lite Extension/Resources');

	async run() {
		await mkdir(path.join(this.resources, 'icons'), { recursive: true });

		await Promise.all([
			this.copy('apps/extension/controller-dist/background.js', 'background.js'),
			this.copy('apps/extension/controller-dist/content.js', 'content.js'),
			this.copy('apps/controller-extension/manifests/safari.json', 'manifest.json'),
			this.copy('apps/extension/public/icons/icon-16.png', 'icons/icon-16.png'),
			this.copy('apps/extension/public/icons/icon-32.png', 'icons/icon-32.png'),
			this.copy('apps/extension/public/icons/icon-48.png', 'icons/icon-48.png'),
			this.copy('apps/extension/public/icons/icon-128.png', 'icons/icon-128.png'),
		]);

		process.stdout.write(`Safari controller synchronized at ${this.resources}\n`);
	}

	private copy(source: string, destination: string) {
		return copyFile(path.join(this.root, source), path.join(this.resources, destination));
	}
}

await new SafariControllerSynchronizer().run();
