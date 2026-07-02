import { Results, type Result } from '@lib/result';
import type { ExtensionState, Settings, SettingsPatch } from '@/types/settings';
import { DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE, SettingsCodec } from '@/types/settings';
import { PopupStateBuilder } from '@composables/PopupController/popupState';
import type { ChromeRuntimeAdapter, PopupRuntimeError } from '@composables/PopupController/chromeRuntime';

/** Tab context required by popup settings operations. */
export interface PopupRuntimeContext {
	activeTabId: number | null;
	activeTabUrl: string;
}

/** Reads, writes, and applies settings across storage and the active tab. */
export class SettingsGateway {
	constructor(private readonly runtime: ChromeRuntimeAdapter) {}

	/** Merge a parsed settings patch into existing settings. */
	static mergeSettingsPatch(existing: Settings, patch: SettingsPatch) {
		return SettingsCodec.migrateSettings({
			...existing,
			...patch,
			siteOverrides: {
				...existing.siteOverrides,
				...(patch.siteOverrides || {}),
			},
		});
	}

	/** Read normalized extension settings from Chrome storage or defaults. */
	async readSettings() {
		if (!this.runtime.isExtensionRuntimeAvailable()) {
			return DEFAULT_SETTINGS;
		}

		const settings = await chrome.storage.sync.get(null);

		return SettingsCodec.migrateSettings(settings);
	}

	/** Persist settings into Chrome storage when the extension runtime is available. */
	async writeSettings(nextSettings: Settings) {
		if (!this.runtime.isExtensionRuntimeAvailable()) {
			return;
		}

		await chrome.storage.sync.set(nextSettings);
	}

	/** Apply settings to the active tab when possible, falling back to persisted settings. */
	async applySettingsToActiveTab(context: PopupRuntimeContext, nextSettings: Settings): Promise<ExtensionState> {
		if (!this.runtime.isExtensionRuntimeAvailable() || !PopupStateBuilder.canInjectIntoTab(context.activeTabUrl)) {
			await this.writeSettings(nextSettings);

			return PopupStateBuilder.buildPopupState(nextSettings, context.activeTabUrl);
		}

		const message = {
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'set-settings',
			patch: nextSettings,
		} satisfies Parameters<ChromeRuntimeAdapter['sendToTab']>[1];

		const firstAttempt = await this.runtime.sendToTab(context.activeTabId, message);

		if (firstAttempt.isOk()) {
			return firstAttempt.value;
		}

		const injected = await this.runtime.injectContentScript(context.activeTabId);

		if (injected.isOk()) {
			const secondAttempt = await this.runtime.sendToTab(context.activeTabId, message);

			if (secondAttempt.isOk()) {
				return secondAttempt.value;
			}
		}

		await this.writeSettings(nextSettings);

		return PopupStateBuilder.buildPopupState(nextSettings, context.activeTabUrl);
	}

	/** Read extension state from the active tab, injecting the content script once if needed. */
	async getStateFromTab(context: PopupRuntimeContext): Promise<Result<ExtensionState, PopupRuntimeError>> {
		const firstAttempt = await this.runtime.sendToTab(context.activeTabId, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

		if (firstAttempt.isOk()) {
			return firstAttempt;
		}

		if (!PopupStateBuilder.canInjectIntoTab(context.activeTabUrl)) {
			return firstAttempt;
		}

		const injected = await this.runtime.injectContentScript(context.activeTabId);

		if (injected.isErr()) {
			return injected;
		}

		return this.runtime.sendToTab(context.activeTabId, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });
	}

	/** Resolve popup state from the active tab or from persisted settings. */
	async getState(context: PopupRuntimeContext): Promise<Result<ExtensionState, PopupRuntimeError>> {
		if (this.runtime.isExtensionRuntimeAvailable() && PopupStateBuilder.canInjectIntoTab(context.activeTabUrl)) {
			return this.getStateFromTab(context);
		}

		return Results.ok(PopupStateBuilder.buildPopupState(await this.readSettings(), context.activeTabUrl));
	}
}
