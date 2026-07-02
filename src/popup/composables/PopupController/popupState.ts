import type { ExtensionState, Settings } from '@/types/settings';
import { SettingsCodec } from '@/types/settings';

/** Derives popup state and tab capabilities from the active tab URL. */
export class PopupStateBuilder {
	/** Extract a normalized host from a tab URL. */
	static getActiveHost(activeTabUrl: string) {
		if (!activeTabUrl) {
			return '';
		}

		try {
			const url = new URL(activeTabUrl);

			return SettingsCodec.normalizeHost(url.hostname || '');
		} catch {
			return '';
		}
	}

	/** Check whether a tab URL supports content-script injection. */
	static canInjectIntoTab(activeTabUrl: string) {
		if (!activeTabUrl) {
			return false;
		}

		try {
			const url = new URL(activeTabUrl);

			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	/** Build popup state from settings and the active tab URL. */
	static buildPopupState(nextSettings: Settings, activeTabUrl: string): ExtensionState {
		const host = PopupStateBuilder.getActiveHost(activeTabUrl);
		const siteEnabled = nextSettings.siteOverrides?.[host] ?? true;

		return {
			settings: nextSettings,
			host,
			active: Boolean(nextSettings.enabled && siteEnabled),
			siteEnabled,
		};
	}
}
