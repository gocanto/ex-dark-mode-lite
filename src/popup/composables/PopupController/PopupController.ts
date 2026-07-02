import { computed, ref } from 'vue';
import type { TimedStatus } from '@composables/TimedStatus';
import type { Settings, SettingsPatch, ThemeMode, ThemePreset } from '@/types/settings';
import { BUILT_IN_PRESETS, DEFAULT_SETTINGS, SettingsCodec } from '@/types/settings';
import { ChromeRuntimeAdapter } from '@composables/PopupController/chromeRuntime';
import { PopupStateBuilder } from '@composables/PopupController/popupState';
import { SettingsGateway } from '@composables/PopupController/settingsFlow';

type ThemeAdjustmentKey = 'brightness' | 'contrast' | 'sepia';

/** Coordinates popup UI state with Chrome extension runtime state. */
export class PopupController {
	readonly activeTabId = ref<number | null>(null);

	readonly activeTabUrl = ref('');

	private readonly runtime = new ChromeRuntimeAdapter();

	private readonly gateway = new SettingsGateway(this.runtime);

	readonly currentState = ref(PopupStateBuilder.buildPopupState(DEFAULT_SETTINGS, this.activeTabUrl.value));

	readonly settings = computed(() => this.currentState.value.settings);

	readonly isExtensionRuntime = computed(() => this.runtime.isExtensionRuntimeAvailable());

	readonly hostLabel = computed(() => this.currentState.value.host || 'Preview mode');

	readonly siteActionLabel = computed(() => (this.currentState.value.siteEnabled ? 'Disable here' : 'Enable here'));

	readonly statusText = computed(() => {
		if (!this.isExtensionRuntime.value) {
			return 'Live preview';
		}

		return this.currentState.value.settings.enabled ? 'Active' : 'Paused';
	});

	/** Built-in presets followed by any user-saved presets. */
	readonly presets = computed<ThemePreset[]>(() => [...BUILT_IN_PRESETS, ...this.currentState.value.settings.customPresets]);

	readonly activePresetId = computed(() => this.currentState.value.settings.activePresetId);

	/** Hosts the user has explicitly turned off (the blocklist). */
	readonly blockedSites = computed(() =>
		Object.entries(this.currentState.value.settings.siteOverrides)
			.filter(([, enabled]) => enabled === false)
			.map(([host]) => host)
			.sort((a, b) => a.localeCompare(b)),
	);

	readonly blockedCount = computed(() => this.blockedSites.value.length);

	constructor(private readonly status: TimedStatus) {}

	/** Tab context required by popup settings operations. */
	private get runtimeContext() {
		return {
			activeTabId: this.activeTabId.value,
			activeTabUrl: this.activeTabUrl.value,
		};
	}

	/** Return the normalized host for the active tab. */
	getActiveHost() {
		return PopupStateBuilder.getActiveHost(this.activeTabUrl.value);
	}

	/** Check whether the active tab can receive the extension content script. */
	canInjectIntoTab() {
		return PopupStateBuilder.canInjectIntoTab(this.activeTabUrl.value);
	}

	/** Build popup state for the current active tab URL. */
	buildState(nextSettings: Settings) {
		return PopupStateBuilder.buildPopupState(nextSettings, this.activeTabUrl.value);
	}

	/** Read normalized extension settings. */
	readSettings() {
		return this.gateway.readSettings();
	}

	/** Apply settings to the active tab and persist when needed. */
	applySettingsToActiveTab(nextSettings: Settings) {
		return this.gateway.applySettingsToActiveTab(this.runtimeContext, nextSettings);
	}

	/** Read popup state from the active tab or persisted settings. */
	getState() {
		return this.gateway.getState(this.runtimeContext);
	}

	/** Merge and save a settings patch. */
	async patchSettings(patch: SettingsPatch, message = 'Saved') {
		const existing = this.currentState.value.settings || (await this.readSettings());

		const nextSettings = SettingsGateway.mergeSettingsPatch(existing, patch);

		this.currentState.value = await this.applySettingsToActiveTab(nextSettings);

		this.status.set(message);
	}

	/** Replace all settings with a normalized settings object. */
	async replaceSettings(nextSettings: Settings, message = 'Saved') {
		const normalizedSettings = SettingsCodec.migrateSettings(nextSettings);

		this.currentState.value = await this.applySettingsToActiveTab(normalizedSettings);

		this.status.set(message);
	}

	/** Select a theme mode and ensure the active site is enabled. */
	async selectMode(mode: ThemeMode) {
		const host = this.currentState.value.host || this.getActiveHost();
		const siteOverrides = { ...this.currentState.value.settings.siteOverrides };

		if (host) {
			siteOverrides[host] = true;
		}

		await this.patchSettings({ mode, siteOverrides, activePresetId: null }, 'Saved');
	}

	/** Commit a single theme adjustment, detaching from any active preset. */
	async commitAdjustment(key: ThemeAdjustmentKey, value: number) {
		await this.patchSettings({ [key]: value, activePresetId: null });
	}

	/** Apply a built-in or saved preset to the current settings. */
	async applyPreset(id: string) {
		const preset = this.presets.value.find((entry) => entry.id === id);

		if (!preset) {
			return;
		}

		await this.patchSettings(
			{
				mode: preset.mode,
				brightness: preset.brightness,
				contrast: preset.contrast,
				sepia: preset.sepia,
				activePresetId: preset.id,
			},
			`Applied ${preset.name}`,
		);
	}

	/** Save the current adjustments as a new custom preset. */
	async savePreset() {
		const { brightness, contrast, customPresets, mode, sepia } = this.currentState.value.settings;
		const id = `custom-${Date.now()}`;

		const preset: ThemePreset = {
			id,
			name: `Custom ${customPresets.length + 1}`,
			mode,
			brightness,
			contrast,
			sepia,
			dot: '#2FE0CE',
			builtin: false,
		};

		await this.patchSettings({ customPresets: [...customPresets, preset], activePresetId: id }, 'Preset saved');
	}

	/** Remove a custom preset by id. */
	async deletePreset(id: string) {
		const { activePresetId, customPresets } = this.currentState.value.settings;
		const nextPresets = customPresets.filter((preset) => preset.id !== id);

		if (nextPresets.length === customPresets.length) {
			return;
		}

		await this.patchSettings(
			{
				customPresets: nextPresets,
				activePresetId: activePresetId === id ? null : activePresetId,
			},
			'Preset removed',
		);
	}

	/** Reset a single adjustment to its default value. */
	async resetAdjustment(key: ThemeAdjustmentKey) {
		await this.patchSettings({ [key]: DEFAULT_SETTINGS[key], activePresetId: null }, 'Reset');
	}

	/** Reset all adjustments to their default values. */
	async resetAdjustments() {
		await this.patchSettings(
			{
				brightness: DEFAULT_SETTINGS.brightness,
				contrast: DEFAULT_SETTINGS.contrast,
				sepia: DEFAULT_SETTINGS.sepia,
				activePresetId: null,
			},
			'Reset',
		);
	}

	/** Re-enable a host, removing it from the blocklist. */
	async unblockSite(host: string) {
		if (!host) {
			return;
		}

		await this.patchSettings(
			{
				siteOverrides: {
					...this.currentState.value.settings.siteOverrides,
					[host]: true,
				},
			},
			'Enabled',
		);
	}

	/** Toggle the extension override for the current host. */
	async toggleSite() {
		const host = this.currentState.value.host || this.getActiveHost();

		if (!host) {
			this.status.set('Open a website tab');

			return;
		}

		const siteEnabled = this.currentState.value.settings.siteOverrides?.[host] ?? true;

		await this.patchSettings(
			{
				siteOverrides: {
					...this.currentState.value.settings.siteOverrides,
					[host]: !siteEnabled,
				},
			},
			siteEnabled ? 'Disabled here' : 'Enabled here',
		);
	}

	/** Restore default settings. */
	async resetSettings() {
		await this.replaceSettings(DEFAULT_SETTINGS, 'Reset');
	}

	/** Render an unexpected or typed runtime failure in the popup status. */
	showError(error: unknown) {
		console.error(error);
		this.status.set(error instanceof Error ? error.message : 'Unavailable');
	}

	/** Initialize popup state from the current runtime context. */
	async init() {
		if (!this.isExtensionRuntime.value) {
			this.currentState.value = this.buildState(DEFAULT_SETTINGS);

			return;
		}

		const activeTab = await this.runtime.queryActiveTab();

		this.activeTabId.value = activeTab.id;
		this.activeTabUrl.value = activeTab.url;

		const state = await this.getState();

		if (state.isOk()) {
			this.currentState.value = state.value;

			return;
		}

		{
			this.currentState.value = this.buildState(await this.readSettings());

			this.showError(state.error);
		}
	}
}
