import type { Settings } from '@/types/settings';
import { DEFAULT_SETTINGS, SettingsCodec } from '@/types/settings';
import type { ControllerState } from '@controller/ControllerProtocol';

/** Pure state machine for managed tabs and controller settings. */
export class ManagedTabRegistry {
	private revision = 0;
	private settings: Settings = { ...DEFAULT_SETTINGS };
	private readonly managedTabIds = new Set<number>();

	/** Restore cached state after an extension background process restarts. */
	restore(input: unknown) {
		if (typeof input !== 'object' || input === null || Array.isArray(input)) {
			return;
		}

		const storedRevision = Reflect.get(input, 'revision');
		const storedTabIds = Reflect.get(input, 'managedTabIds');
		const revision = typeof storedRevision === 'number' && Number.isSafeInteger(storedRevision) && storedRevision >= 0 ? storedRevision : 0;
		const tabIds = Array.isArray(storedTabIds) ? storedTabIds : [];

		this.revision = revision;
		this.settings = SettingsCodec.migrateSettings(Reflect.get(input, 'settings'));
		this.managedTabIds.clear();

		for (const tabId of tabIds) {
			if (typeof tabId === 'number' && Number.isSafeInteger(tabId) && tabId >= 0) {
				this.managedTabIds.add(tabId);
			}
		}
	}

	/** Replace settings when the native revision is current or newer. */
	replaceSettings(revision: number, input: unknown) {
		if (revision < this.revision) {
			return false;
		}

		this.revision = revision;
		this.settings = SettingsCodec.migrateSettings(input);

		return true;
	}

	/** Add a browser tab to the managed set. */
	manage(tabId: number) {
		this.managedTabIds.add(tabId);
	}

	/** Remove a browser tab from the managed set. */
	unmanage(tabId: number) {
		this.managedTabIds.delete(tabId);
	}

	/** Whether the tab should currently receive the dark-mode engine. */
	shouldApply(tabId: number, url: string) {
		if (!this.managedTabIds.has(tabId) || !this.settings.enabled) {
			return false;
		}

		const host = ManagedTabRegistry.parseHost(url);

		if (!host) {
			return false;
		}

		return this.settings.siteOverrides[host] ?? true;
	}

	/** Whether a tab is explicitly managed, independent of global/site state. */
	isManaged(tabId: number) {
		return this.managedTabIds.has(tabId);
	}

	/** Snapshot serializable extension state for persistence or the native app. */
	snapshot(): ControllerState {
		return {
			revision: this.revision,
			settings: this.settings,
			managedTabIds: [...this.managedTabIds].sort((left, right) => left - right),
		};
	}

	private static parseHost(url: string) {
		try {
			const parsed = new URL(url);

			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				return '';
			}

			return SettingsCodec.normalizeHost(parsed.hostname);
		} catch {
			return '';
		}
	}
}
