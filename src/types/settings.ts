/** Display modes supported by the extension. */
export type ThemeMode = 'smart' | 'invert' | 'soft';

/** A named bundle of theme adjustments the user can apply in one click. */
export interface ThemePreset {
	id: string;
	name: string;
	mode: ThemeMode;
	brightness: number;
	contrast: number;
	sepia: number;
	dot: string;
	builtin: boolean;
}

/** Persisted user settings for the extension. */
export interface Settings {
	enabled: boolean;
	mode: ThemeMode;
	brightness: number;
	contrast: number;
	sepia: number;
	settingsVersion: number;
	siteOverrides: Record<string, boolean>;
	customPresets: ThemePreset[];
	activePresetId: string | null;
}

/** Parsed settings fields that may be updated by UI, storage, or messages. */
export interface SettingsPatch {
	enabled?: boolean;
	mode?: ThemeMode;
	brightness?: number;
	contrast?: number;
	sepia?: number;
	settingsVersion?: number;
	siteOverrides?: Record<string, boolean>;
	customPresets?: ThemePreset[];
	activePresetId?: string | null;
}

/** Current extension state rendered by the popup. */
export interface ExtensionState {
	settings: Settings;
	host: string;
	active: boolean;
	siteEnabled: boolean;
}

/** Built-in presets offered before the user saves their own. */
export const BUILT_IN_PRESETS: readonly ThemePreset[] = [
	{ id: 'default', name: 'Default', mode: 'smart', brightness: 100, contrast: 92, sepia: 0, dot: '#2FE0CE', builtin: true },
	{ id: 'reading', name: 'Reading', mode: 'soft', brightness: 96, contrast: 88, sepia: 18, dot: '#7C8CF8', builtin: true },
	{ id: 'night-owl', name: 'Night Owl', mode: 'smart', brightness: 78, contrast: 100, sepia: 0, dot: '#B084F5', builtin: true },
];

/** Default settings used when storage or messages omit fields. */
export const DEFAULT_SETTINGS = {
	enabled: true,
	mode: 'smart',
	brightness: 100,
	contrast: 92,
	sepia: 0,
	settingsVersion: 3,
	siteOverrides: {},
	customPresets: [],
	activePresetId: 'default',
} satisfies Settings;

/** Stable message source used to ignore unrelated runtime messages. */
export const EXTENSION_MESSAGE_SOURCE = 'dark-mode-lite';

/** Runtime messages accepted by the popup/content-script boundary. */
export type PopupMessage =
	| { source: typeof EXTENSION_MESSAGE_SOURCE; type: 'get-state' }
	| { source: typeof EXTENSION_MESSAGE_SOURCE; type: 'set-settings'; patch: SettingsPatch }
	| { source: typeof EXTENSION_MESSAGE_SOURCE; type: 'toggle-site' };

/** Parses and normalizes untrusted settings, presets, and runtime messages. */
export class SettingsCodec {
	/** Normalize a hostname for settings lookup. */
	static normalizeHost(host: string) {
		return host.replace(/^www\./, '');
	}

	/** Parse a theme mode from untrusted input. */
	static parseThemeMode(input: unknown): ThemeMode {
		if (input === 'smart' || input === 'invert' || input === 'soft') {
			return input;
		}

		return DEFAULT_SETTINGS.mode;
	}

	/** Parse a single theme preset from untrusted input, or null when invalid. */
	static parseThemePreset(input: unknown): ThemePreset | null {
		if (!SettingsCodec.isRecord(input)) {
			return null;
		}

		if (typeof input.id !== 'string' || input.id.length === 0) {
			return null;
		}

		const brightness = SettingsCodec.parseNumberInRange(input.brightness, 50, 150);
		const contrast = SettingsCodec.parseNumberInRange(input.contrast, 50, 150);
		const sepia = SettingsCodec.parseNumberInRange(input.sepia, 0, 100);

		return {
			id: input.id,
			name: typeof input.name === 'string' && input.name.length > 0 ? input.name : input.id,
			mode: SettingsCodec.parseThemeMode(input.mode),
			brightness: brightness ?? DEFAULT_SETTINGS.brightness,
			contrast: contrast ?? DEFAULT_SETTINGS.contrast,
			sepia: sepia ?? DEFAULT_SETTINGS.sepia,
			dot: typeof input.dot === 'string' && input.dot.length > 0 ? input.dot : '#2FE0CE',
			builtin: false,
		};
	}

	/** Parse untrusted settings into a normalized settings patch. */
	static parseSettingsPatch(input: unknown): SettingsPatch {
		if (!SettingsCodec.isRecord(input)) {
			return {};
		}

		const patch: SettingsPatch = {};

		if (typeof input.enabled === 'boolean') {
			patch.enabled = input.enabled;
		}

		if (typeof input.mode === 'string') {
			patch.mode = SettingsCodec.parseThemeMode(input.mode);
		}

		const brightness = SettingsCodec.parseNumberInRange(input.brightness, 50, 150);

		if (brightness !== undefined) {
			patch.brightness = brightness;
		}

		const contrast = SettingsCodec.parseNumberInRange(input.contrast, 50, 150);

		if (contrast !== undefined) {
			patch.contrast = contrast;
		}

		const sepia = SettingsCodec.parseNumberInRange(input.sepia, 0, 100);

		if (sepia !== undefined) {
			patch.sepia = sepia;
		}

		const settingsVersion = SettingsCodec.parseFiniteNumber(input.settingsVersion);

		if (settingsVersion !== undefined) {
			patch.settingsVersion = settingsVersion;
		}

		const siteOverrides = SettingsCodec.parseSiteOverrides(input.siteOverrides);

		if (siteOverrides !== undefined) {
			patch.siteOverrides = siteOverrides;
		}

		const customPresets = SettingsCodec.parseCustomPresets(input.customPresets);

		if (customPresets !== undefined) {
			patch.customPresets = customPresets;
		}

		if ('activePresetId' in input) {
			patch.activePresetId = SettingsCodec.parseActivePresetId(input.activePresetId);
		}

		return patch;
	}

	/** Parse untrusted settings into a complete normalized settings object. */
	static parseSettings(input: unknown): Settings {
		const patch = SettingsCodec.parseSettingsPatch(input);

		const nextSettings: Settings = {
			...DEFAULT_SETTINGS,
			...patch,
			siteOverrides: {
				...DEFAULT_SETTINGS.siteOverrides,
				...(patch.siteOverrides ?? {}),
			},
		};

		if (SettingsCodec.isLegacyInvertSettings(input)) {
			nextSettings.mode = 'smart';
		}

		nextSettings.settingsVersion = DEFAULT_SETTINGS.settingsVersion;

		return nextSettings;
	}

	/** Migrate stored settings from older versions into the current settings shape. */
	static migrateSettings(storedSettings?: unknown): Settings {
		return SettingsCodec.parseSettings(storedSettings);
	}

	/** Parse an extension state response from an untrusted runtime message. */
	static parseExtensionState(input: unknown): ExtensionState | null {
		if (!SettingsCodec.isRecord(input)) {
			return null;
		}

		const settings = SettingsCodec.parseSettings(input.settings);
		const host = typeof input.host === 'string' ? SettingsCodec.normalizeHost(input.host) : '';
		const siteEnabled = typeof input.siteEnabled === 'boolean' ? input.siteEnabled : (settings.siteOverrides[host] ?? true);
		const active = typeof input.active === 'boolean' ? input.active : Boolean(settings.enabled && siteEnabled);

		return {
			settings,
			host,
			active,
			siteEnabled,
		};
	}

	/** Parse a popup/content-script message from untrusted runtime input. */
	static parsePopupMessage(input: unknown): PopupMessage | null {
		if (!SettingsCodec.isRecord(input) || input.source !== EXTENSION_MESSAGE_SOURCE) {
			return null;
		}

		if (input.type === 'get-state') {
			return { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' };
		}

		if (input.type === 'toggle-site') {
			return { source: EXTENSION_MESSAGE_SOURCE, type: 'toggle-site' };
		}

		if (input.type === 'set-settings') {
			return {
				source: EXTENSION_MESSAGE_SOURCE,
				type: 'set-settings',
				patch: SettingsCodec.parseSettingsPatch(input.patch),
			};
		}

		return null;
	}

	private static isRecord(input: unknown): input is Record<string, unknown> {
		return typeof input === 'object' && input !== null && !Array.isArray(input);
	}

	private static parseFiniteNumber(input: unknown): number | undefined {
		if (typeof input !== 'number' || !Number.isFinite(input)) {
			return undefined;
		}

		return input;
	}

	private static parseNumberInRange(input: unknown, min: number, max: number): number | undefined {
		const number = SettingsCodec.parseFiniteNumber(input);

		if (number === undefined) {
			return undefined;
		}

		return Math.min(max, Math.max(min, number));
	}

	private static parseSiteOverrides(input: unknown): Record<string, boolean> | undefined {
		if (!SettingsCodec.isRecord(input)) {
			return undefined;
		}

		const siteOverrides: Record<string, boolean> = {};

		for (const [host, enabled] of Object.entries(input)) {
			if (typeof enabled === 'boolean') {
				siteOverrides[SettingsCodec.normalizeHost(host)] = enabled;
			}
		}

		return siteOverrides;
	}

	private static parseCustomPresets(input: unknown): ThemePreset[] | undefined {
		if (!Array.isArray(input)) {
			return undefined;
		}

		const seen = new Set<string>();
		const presets: ThemePreset[] = [];

		for (const entry of input) {
			const preset = SettingsCodec.parseThemePreset(entry);

			if (preset && !seen.has(preset.id)) {
				seen.add(preset.id);
				presets.push(preset);
			}
		}

		return presets;
	}

	private static parseActivePresetId(input: unknown): string | null {
		return typeof input === 'string' && input.length > 0 ? input : null;
	}

	private static isLegacyInvertSettings(input: unknown) {
		if (!SettingsCodec.isRecord(input)) {
			return false;
		}

		return !SettingsCodec.parseFiniteNumber(input.settingsVersion) && input.mode === 'invert';
	}
}
