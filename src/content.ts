type ThemeMode = 'smart' | 'invert' | 'soft';

interface ThemePreset {
	id: string;
	name: string;
	mode: ThemeMode;
	brightness: number;
	contrast: number;
	sepia: number;
	dot: string;
	builtin: boolean;
}

interface Settings {
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

interface SettingsPatch {
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

interface ExtensionState {
	settings: Settings;
	host: string;
	active: boolean;
	siteEnabled: boolean;
}

type PopupMessage = { source: 'dark-mode-lite'; type: 'get-state' } | { source: 'dark-mode-lite'; type: 'set-settings'; patch: SettingsPatch } | { source: 'dark-mode-lite'; type: 'toggle-site' };

interface Color {
	r: number;
	g: number;
	b: number;
	a: number;
}

type StoredStyle = Record<string, { value: string; priority: string }>;

/** Applies dark-mode styling to the current page and syncs with the popup. */
class ContentScript {
	private static readonly MESSAGE_SOURCE = 'dark-mode-lite';
	private static readonly STYLE_ID = 'dark-mode-lite-style';
	private static readonly LEGACY_STYLE_ID = 'personal-dark-mode-lite-style';
	private static readonly ROOT_ATTR = 'data-dm-lite-active';
	private static readonly MODE_ATTR = 'data-dm-lite-mode';
	private static readonly LEGACY_ROOT_ATTR = 'data-pdm-lite-active';
	private static readonly LEGACY_MODE_ATTR = 'data-pdm-lite-mode';

	private static readonly SKIPPABLE_TAGS = ['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'IMG', 'VIDEO', 'PICTURE', 'CANVAS', 'SVG', 'PATH', 'IFRAME'];

	private static readonly DEFAULT_SETTINGS: Settings = {
		enabled: true,
		mode: 'smart',
		brightness: 100,
		contrast: 92,
		sepia: 0,
		settingsVersion: 3,
		siteOverrides: {},
		customPresets: [],
		activePresetId: 'default',
	};

	private settings: Settings = { ...ContentScript.DEFAULT_SETTINGS };
	private smartObserver: MutationObserver | null = null;
	private smartScanTimer = 0;

	private readonly originalStyles = new Map<HTMLElement, StoredStyle>();

	/** Begin listening for settings and apply the stored theme. */
	start() {
		chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => this.handleMessage(rawMessage, sendResponse));

		chrome.storage.onChanged.addListener((changes, areaName) => this.handleStorageChanged(changes, areaName));

		this.readSettings();
	}

	private handleMessage(rawMessage: unknown, sendResponse: (state: ExtensionState) => void) {
		const message = this.parsePopupMessage(rawMessage);

		if (!message) {
			return false;
		}

		if (message.type === 'get-state') {
			sendResponse(this.getState());

			return false;
		}

		if (message.type === 'set-settings') {
			this.updateSettings(message.patch || {}, sendResponse);

			return true;
		}

		if (message.type === 'toggle-site') {
			const host = this.getHost();

			const siteOverrides = {
				...this.settings.siteOverrides,
				[host]: !this.getSiteState(this.settings),
			};

			this.updateSettings({ siteOverrides }, sendResponse);

			return true;
		}

		return false;
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

	private normalizeHost(host: string) {
		return host.replace(/^www\./, '');
	}

	private getHost() {
		return this.normalizeHost(location.hostname || '');
	}

	private getSiteState(nextSettings = this.settings) {
		const host = this.getHost();
		const override = nextSettings.siteOverrides?.[host];

		return override ?? true;
	}

	private isActive(nextSettings = this.settings) {
		return Boolean(nextSettings.enabled && this.getSiteState(nextSettings));
	}

	private clamp(value: unknown, min: number, max: number) {
		const number = Number(value);

		if (!Number.isFinite(number)) {
			return min;
		}

		return Math.min(max, Math.max(min, number));
	}

	private parseColor(value: string) {
		const match = String(value).match(/rgba?\(([^)]+)\)/);
		const colorChannels = match?.[1];

		if (!colorChannels) {
			return null;
		}

		const parts = colorChannels.split(',').map((part) => Number.parseFloat(part.trim()));
		const r = parts[0];
		const g = parts[1];
		const b = parts[2];
		const a = parts[3] ?? 1;

		if (r === undefined || g === undefined || b === undefined || ![r, g, b, a].every(Number.isFinite) || a === 0) {
			return null;
		}

		return { r, g, b, a };
	}

	private luminance(color: Color) {
		const toLinear = (channel: number) => {
			const value = channel / 255;

			return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
		};

		return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
	}

	private rememberStyle(element: HTMLElement, property: string) {
		let original = this.originalStyles.get(element);

		if (!original) {
			original = {};
			this.originalStyles.set(element, original);
		}

		if (!Object.hasOwn(original, property)) {
			original[property] = {
				value: element.style.getPropertyValue(property),
				priority: element.style.getPropertyPriority(property),
			};
		}
	}

	private setImportant(element: HTMLElement, property: string, value: string) {
		this.rememberStyle(element, property);
		element.style.setProperty(property, value, 'important');
	}

	private restoreSmartStyles() {
		for (const [element, styles] of this.originalStyles) {
			if (!element?.style) {
				continue;
			}

			for (const [property, original] of Object.entries(styles)) {
				if (original.value) {
					element.style.setProperty(property, original.value, original.priority);
				} else {
					element.style.removeProperty(property);
				}
			}
		}

		this.originalStyles.clear();
	}

	private isSkippableElement(element: HTMLElement) {
		return ContentScript.SKIPPABLE_TAGS.includes(element.tagName);
	}

	private smartenElement(element: Element) {
		if (!(element instanceof HTMLElement) || this.isSkippableElement(element)) {
			return;
		}

		const computed = getComputedStyle(element);
		const bg = this.parseColor(computed.backgroundColor);
		const text = this.parseColor(computed.color);
		const isRootSurface = element === document.body || element === document.documentElement;

		if (isRootSurface) {
			this.setImportant(element, 'background-color', '#111318');
			this.setImportant(element, 'color', '#e9edf5');

			return;
		}

		if (bg) {
			const bgLuma = this.luminance(bg);

			if (bgLuma > 0.78) {
				this.setImportant(element, 'background-color', '#171b22');
			} else if (bgLuma > 0.58) {
				this.setImportant(element, 'background-color', '#202632');
			}
		}

		if (text) {
			const textLuma = this.luminance(text);

			if (element.closest('a')) {
				this.setImportant(element, 'color', '#8ab4ff');
			} else if (textLuma < 0.42) {
				this.setImportant(element, 'color', '#e9edf5');
			}
		}

		for (const side of ['top', 'right', 'bottom', 'left']) {
			const property = `border-${side}-color`;
			const border = this.parseColor(computed.getPropertyValue(property));

			if (border && this.luminance(border) > 0.52) {
				this.setImportant(element, property, 'rgba(255, 255, 255, 0.18)');
			}
		}
	}

	private scanSmartMode() {
		this.smartScanTimer = 0;
		if (!this.isActive(this.settings) || this.settings.mode !== 'smart') {
			return;
		}

		const elements = [document.documentElement, document.body, ...document.querySelectorAll('body *')];

		for (let index = 0; index < elements.length && index < 5000; index += 1) {
			const element = elements[index];

			if (element) {
				this.smartenElement(element);
			}
		}
	}

	private scheduleSmartScan() {
		if (this.smartScanTimer) {
			return;
		}

		this.smartScanTimer = window.setTimeout(() => this.scanSmartMode(), 80);
	}

	private startSmartMode() {
		this.scheduleSmartScan();
		if (this.smartObserver) {
			return;
		}

		this.smartObserver = new MutationObserver(() => this.scheduleSmartScan());
		this.smartObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}

	private stopSmartMode() {
		if (this.smartObserver) {
			this.smartObserver.disconnect();
			this.smartObserver = null;
		}

		if (this.smartScanTimer) {
			window.clearTimeout(this.smartScanTimer);
			this.smartScanTimer = 0;
		}

		this.restoreSmartStyles();
	}

	private parseThemeMode(input: unknown): ThemeMode {
		if (input === 'smart' || input === 'invert' || input === 'soft') {
			return input;
		}

		return ContentScript.DEFAULT_SETTINGS.mode;
	}

	private parseSettingsPatch(input: unknown): SettingsPatch {
		if (!this.isRecord(input)) {
			return {};
		}

		const patch: SettingsPatch = {};

		if (typeof input.enabled === 'boolean') {
			patch.enabled = input.enabled;
		}

		if (typeof input.mode === 'string') {
			patch.mode = this.parseThemeMode(input.mode);
		}

		const brightness = this.parseNumberInRange(input.brightness, 50, 150);

		if (brightness !== undefined) {
			patch.brightness = brightness;
		}

		const contrast = this.parseNumberInRange(input.contrast, 50, 150);

		if (contrast !== undefined) {
			patch.contrast = contrast;
		}

		const sepia = this.parseNumberInRange(input.sepia, 0, 100);

		if (sepia !== undefined) {
			patch.sepia = sepia;
		}

		const settingsVersion = this.parseFiniteNumber(input.settingsVersion);

		if (settingsVersion !== undefined) {
			patch.settingsVersion = settingsVersion;
		}

		const siteOverrides = this.parseSiteOverrides(input.siteOverrides);

		if (siteOverrides !== undefined) {
			patch.siteOverrides = siteOverrides;
		}

		const customPresets = this.parseCustomPresets(input.customPresets);

		if (customPresets !== undefined) {
			patch.customPresets = customPresets;
		}

		if ('activePresetId' in input) {
			patch.activePresetId = typeof input.activePresetId === 'string' && input.activePresetId.length > 0 ? input.activePresetId : null;
		}

		return patch;
	}

	private parseThemePreset(input: unknown): ThemePreset | null {
		if (!this.isRecord(input) || typeof input.id !== 'string' || input.id.length === 0) {
			return null;
		}

		return {
			id: input.id,
			name: typeof input.name === 'string' && input.name.length > 0 ? input.name : input.id,
			mode: this.parseThemeMode(input.mode),
			brightness: this.parseNumberInRange(input.brightness, 50, 150) ?? ContentScript.DEFAULT_SETTINGS.brightness,
			contrast: this.parseNumberInRange(input.contrast, 50, 150) ?? ContentScript.DEFAULT_SETTINGS.contrast,
			sepia: this.parseNumberInRange(input.sepia, 0, 100) ?? ContentScript.DEFAULT_SETTINGS.sepia,
			dot: typeof input.dot === 'string' && input.dot.length > 0 ? input.dot : '#2FE0CE',
			builtin: false,
		};
	}

	private parseCustomPresets(input: unknown): ThemePreset[] | undefined {
		if (!Array.isArray(input)) {
			return undefined;
		}

		const seen = new Set<string>();
		const presets: ThemePreset[] = [];

		for (const entry of input) {
			const preset = this.parseThemePreset(entry);

			if (preset && !seen.has(preset.id)) {
				seen.add(preset.id);
				presets.push(preset);
			}
		}

		return presets;
	}

	private migrateSettings(storedSettings?: unknown): Settings {
		const patch = this.parseSettingsPatch(storedSettings);

		const nextSettings: Settings = {
			...ContentScript.DEFAULT_SETTINGS,
			...patch,
			siteOverrides: {
				...ContentScript.DEFAULT_SETTINGS.siteOverrides,
				...(patch.siteOverrides ?? {}),
			},
		};

		if (this.isLegacyInvertSettings(storedSettings)) {
			nextSettings.mode = 'smart';
		}

		nextSettings.settingsVersion = ContentScript.DEFAULT_SETTINGS.settingsVersion;

		return nextSettings;
	}

	private parsePopupMessage(input: unknown): PopupMessage | null {
		if (!this.isRecord(input) || input.source !== ContentScript.MESSAGE_SOURCE) {
			return null;
		}

		if (input.type === 'get-state') {
			return { source: ContentScript.MESSAGE_SOURCE, type: 'get-state' };
		}

		if (input.type === 'toggle-site') {
			return { source: ContentScript.MESSAGE_SOURCE, type: 'toggle-site' };
		}

		if (input.type === 'set-settings') {
			return {
				source: ContentScript.MESSAGE_SOURCE,
				type: 'set-settings',
				patch: this.parseSettingsPatch(input.patch),
			};
		}

		return null;
	}

	private isRecord(input: unknown): input is Record<string, unknown> {
		return typeof input === 'object' && input !== null && !Array.isArray(input);
	}

	private parseFiniteNumber(input: unknown): number | undefined {
		if (typeof input !== 'number' || !Number.isFinite(input)) {
			return undefined;
		}

		return input;
	}

	private parseNumberInRange(input: unknown, min: number, max: number): number | undefined {
		const number = this.parseFiniteNumber(input);

		if (number === undefined) {
			return undefined;
		}

		return Math.min(max, Math.max(min, number));
	}

	private parseSiteOverrides(input: unknown): Record<string, boolean> | undefined {
		if (!this.isRecord(input)) {
			return undefined;
		}

		const siteOverrides: Record<string, boolean> = {};

		for (const [host, enabled] of Object.entries(input)) {
			if (typeof enabled === 'boolean') {
				siteOverrides[this.normalizeHost(host)] = enabled;
			}
		}

		return siteOverrides;
	}

	private isLegacyInvertSettings(input: unknown) {
		if (!this.isRecord(input)) {
			return false;
		}

		return !this.parseFiniteNumber(input.settingsVersion) && input.mode === 'invert';
	}

	private createCSS(nextSettings: Settings) {
		const brightness = this.clamp(nextSettings.brightness, 50, 150);
		const contrast = this.clamp(nextSettings.contrast, 50, 150);
		const sepia = this.clamp(nextSettings.sepia, 0, 100);
		const ROOT_ATTR = ContentScript.ROOT_ATTR;
		const MODE_ATTR = ContentScript.MODE_ATTR;

		return `
      html[${ROOT_ATTR}="true"] {
        color-scheme: dark !important;
        --dm-lite-bg: #111318;
        --dm-lite-surface: #1a1d24;
        --dm-lite-surface-2: #232833;
        --dm-lite-text: #e9edf5;
        --dm-lite-muted: #aab2c2;
        --dm-lite-link: #8ab4ff;
        --dm-lite-border: rgba(255, 255, 255, 0.22);
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"],
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] :where(
        p,
        span,
        li,
        label,
        strong,
        em,
        small,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        code,
        pre,
        th,
        td
      ) {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] :where(a, a *) {
        color: var(--dm-lite-link) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] :where(
        [style*="background: white"],
        [style*="background:white"],
        [style*="background-color: white"],
        [style*="background-color:white"],
        [style*="background: rgb(255"],
        [style*="background-color: rgb(255"]
      ) {
        background: var(--dm-lite-bg) !important;
        background-color: var(--dm-lite-bg) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] img,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] video,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] picture,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] canvas,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] svg,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] iframe {
        filter: brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] input,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] textarea,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] select,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] {
        background: white !important;
        filter: invert(1) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] img,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] video,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] picture,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] canvas,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] iframe,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] svg,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"],
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] body,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] main,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] article,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] section,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] aside,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] header,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] footer,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] nav,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] div,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] form,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] dialog {
        background-color: var(--dm-lite-bg) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] p,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] span,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] li,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] label,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] strong,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] em,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h1,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h2,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h3,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h4,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h5,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h6,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] code,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] pre,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] table,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] th,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] td {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] a {
        color: var(--dm-lite-link) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] input,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] textarea,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] select,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] input::placeholder,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] textarea::placeholder {
        color: var(--dm-lite-muted) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] pre,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] code,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] blockquote {
        background-color: var(--dm-lite-surface-2) !important;
      }
    `;
	}

	private cleanupLegacyNamespace(root = document.documentElement) {
		document.getElementById(ContentScript.LEGACY_STYLE_ID)?.remove();
		root.removeAttribute(ContentScript.LEGACY_ROOT_ATTR);
		root.removeAttribute(ContentScript.LEGACY_MODE_ATTR);
	}

	private ensureStyle() {
		const existingStyle = document.getElementById(ContentScript.STYLE_ID);

		if (existingStyle instanceof HTMLStyleElement) {
			return existingStyle;
		}

		const style = document.createElement('style');

		style.id = ContentScript.STYLE_ID;
		style.setAttribute('data-owner', 'dark-mode-lite');
		(document.documentElement || document.head || document).appendChild(style);

		return style;
	}

	private applySettings(nextSettings: unknown) {
		const previousMode = this.settings.mode;

		this.settings = this.migrateSettings(nextSettings);

		const root = document.documentElement;
		const active = this.isActive(this.settings);

		this.cleanupLegacyNamespace(root);

		const style = this.ensureStyle();
		const mode = ['smart', 'soft', 'invert'].includes(this.settings.mode) ? this.settings.mode : 'smart';

		style.textContent = this.createCSS(this.settings);
		root.setAttribute(ContentScript.MODE_ATTR, mode);

		if (previousMode === 'smart' && (!active || mode !== 'smart')) {
			this.stopSmartMode();
		}

		if (active) {
			root.setAttribute(ContentScript.ROOT_ATTR, 'true');
			if (mode === 'smart') {
				this.startSmartMode();
			}
		} else {
			root.removeAttribute(ContentScript.ROOT_ATTR);
			this.stopSmartMode();
		}
	}

	private readSettings() {
		chrome.storage.sync.get(null, (storedSettings) => {
			this.applySettings(storedSettings);
		});
	}

	private updateSettings(patch: SettingsPatch, callback?: (state: ExtensionState) => void) {
		const nextSettings = this.migrateSettings({
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
	const SCRIPT_VERSION = 5;

	const loader = globalThis as typeof globalThis & {
		__DARK_MODE_LITE_LOADED__?: number;
	};

	if ((loader.__DARK_MODE_LITE_LOADED__ || 0) >= SCRIPT_VERSION) {
		return;
	}

	loader.__DARK_MODE_LITE_LOADED__ = SCRIPT_VERSION;

	new ContentScript().start();
})();
