import { DarkModeEngine } from '@content/DarkModeEngine';
import { SettingsCodec } from '@/types/settings';

const CONTROLLER_MESSAGE_SOURCE = 'dark-mode-lite-controller';

type ControllerContentCommand =
	| { readonly source: typeof CONTROLLER_MESSAGE_SOURCE; readonly type: 'apply'; readonly settings: unknown; readonly active: boolean }
	| { readonly source: typeof CONTROLLER_MESSAGE_SOURCE; readonly type: 'dispose' };

/** Receives tab-scoped settings from the companion extension background page. */
class ControllerContentScript {
	private readonly engine = new DarkModeEngine();

	/** Start the page-side companion runtime and announce that this frame is ready. */
	start() {
		chrome.runtime.onMessage.addListener((input) => this.handleMessage(input));
		chrome.runtime.sendMessage({ source: CONTROLLER_MESSAGE_SOURCE, type: 'ready' }, () => void chrome.runtime.lastError);
	}

	private handleMessage(input: unknown) {
		const command = this.parseCommand(input);

		if (!command) {
			return false;
		}

		if (command.type === 'dispose') {
			this.engine.dispose();

			return false;
		}

		const settings = SettingsCodec.migrateSettings(command.settings);

		this.engine.apply(settings, command.active);

		return false;
	}

	private parseCommand(input: unknown): ControllerContentCommand | null {
		if (typeof input !== 'object' || input === null || Array.isArray(input)) {
			return null;
		}

		// SAFETY: the object/array/null guard above establishes an object suitable
		// for string-keyed protocol lookup at this runtime boundary.
		const record = input as Record<string, unknown>;

		if (record.source !== CONTROLLER_MESSAGE_SOURCE) {
			return null;
		}

		if (record.type === 'dispose') {
			return { source: CONTROLLER_MESSAGE_SOURCE, type: 'dispose' };
		}

		if (record.type === 'apply' && typeof record.active === 'boolean') {
			return {
				source: CONTROLLER_MESSAGE_SOURCE,
				type: 'apply',
				settings: record.settings,
				active: record.active,
			};
		}

		return null;
	}
}

(() => {
	const scriptVersion = 1;

	const loader = globalThis as typeof globalThis & {
		__DARK_MODE_LITE_CONTROLLER_LOADED__?: number;
	};

	if ((loader.__DARK_MODE_LITE_CONTROLLER_LOADED__ || 0) >= scriptVersion) {
		return;
	}

	loader.__DARK_MODE_LITE_CONTROLLER_LOADED__ = scriptVersion;

	new ControllerContentScript().start();
})();
