export const DEFAULT_SETTINGS = {
	enabled: true,
	mode: 'smart',
	brightness: 100,
	contrast: 92,
	sepia: 0,
	settingsVersion: 2,
	siteOverrides: {},
} satisfies Settings;

export type ThemeMode = 'smart' | 'invert' | 'soft';

export interface Settings {
	enabled: boolean;
	mode: ThemeMode;
	brightness: number;
	contrast: number;
	sepia: number;
	settingsVersion: number;
	siteOverrides: Record<string, boolean>;
}

export interface ExtensionState {
	settings: Settings;
	host: string;
	active: boolean;
	siteEnabled: boolean;
}

export type PopupMessage =
	| { source: 'personal-dark-mode-lite'; type: 'get-state' }
	| { source: 'personal-dark-mode-lite'; type: 'set-settings'; patch: Partial<Settings> }
	| { source: 'personal-dark-mode-lite'; type: 'toggle-site' };

export function normalizeHost(host: string) {
	return host.replace(/^www\./, '');
}

export function migrateSettings(storedSettings?: Partial<Settings> | null): Settings {
	const nextSettings: Settings = {
		...DEFAULT_SETTINGS,
		...(storedSettings || {}),
		siteOverrides: {
			...DEFAULT_SETTINGS.siteOverrides,
			...(storedSettings?.siteOverrides || {}),
		},
	};

	if (!storedSettings?.settingsVersion && storedSettings?.mode === 'invert') {
		nextSettings.mode = 'smart';
	}

	nextSettings.settingsVersion = DEFAULT_SETTINGS.settingsVersion;

	return nextSettings;
}
