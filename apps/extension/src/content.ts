import { DarkModeEngine } from '@content/DarkModeEngine';
import type { ExtensionState, Settings, SettingsPatch } from '@/types/settings';
import { DEFAULT_SETTINGS, SettingsCodec } from '@/types/settings';

/** Applies extension settings to the current page and syncs with the popup. */
class ContentScript {
	private settings: Settings = { ...DEFAULT_SETTINGS };
	private readonly engine = new DarkModeEngine();

	/** Begin listening for settings and apply the stored theme. */
	start() {
		chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => this.handleMessage(rawMessage, sendResponse));
		chrome.storage.onChanged.addListener((changes, areaName) => this.handleStorageChanged(changes, areaName));
		this.readSettings();
	}

	private handleMessage(rawMessage: unknown, sendResponse: (state: ExtensionState) => void) {
		const message = SettingsCodec.parsePopupMessage(rawMessage);

		if (!message) {
			return false;
		}

		if (message.type === 'get-state') {
			sendResponse(this.getState());

			return false;
		}

		if (message.type === 'set-settings') {
			this.updateSettings(message.patch, sendResponse);

			return true;
		}

		const host = this.getHost();

		const siteOverrides = {
			...this.settings.siteOverrides,
			[host]: !this.getSiteState(this.settings),
		};

		this.updateSettings({ siteOverrides }, sendResponse);

		return true;
	}

	private handleStorageChanged(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
		if (areaName !== 'sync') {
			return;
		}

		const nextSettings: Record<string, unknown> = { ...this.settings };

		for (const [key, change] of Object.entries(changes)) {
			nextSettings[key] = change.newValue;
		}

		this.applySettings(nextSettings);
	}

	private getHost() {
		return SettingsCodec.normalizeHost(location.hostname || '');
	}

	private getSiteState(nextSettings = this.settings) {
		const override = nextSettings.siteOverrides[this.getHost()];

		return override ?? true;
	}

	private isActive(nextSettings = this.settings) {
		return Boolean(nextSettings.enabled && this.getSiteState(nextSettings));
	}

	private applySettings(input: unknown) {
		this.settings = SettingsCodec.migrateSettings(input);
		this.engine.apply(this.settings, this.isActive(this.settings));
	}

	private readSettings() {
		chrome.storage.sync.get(null, (storedSettings) => this.applySettings(storedSettings));
	}

	private updateSettings(patch: SettingsPatch, callback?: (state: ExtensionState) => void) {
		const nextSettings = SettingsCodec.migrateSettings({
			...this.settings,
			...patch,
			siteOverrides: patch.siteOverrides ? { ...patch.siteOverrides } : { ...this.settings.siteOverrides },
		});

		chrome.storage.sync.set(nextSettings, () => {
			this.applySettings(nextSettings);
			callback?.(this.getState());
		});
	}

	private getState(): ExtensionState {
		return {
			settings: this.settings,
			host: this.getHost(),
			active: this.isActive(this.settings),
			siteEnabled: this.getSiteState(this.settings),
		};
	}
}

(() => {
	const scriptVersion = 6;

	const loader = globalThis as typeof globalThis & {
		__DARK_MODE_LITE_LOADED__?: number;
	};

	if ((loader.__DARK_MODE_LITE_LOADED__ || 0) >= scriptVersion) {
		return;
	}

	loader.__DARK_MODE_LITE_LOADED__ = scriptVersion;

	new ContentScript().start();
})();
