import type { Settings, ThemeMode } from '@/types/settings';
import { SettingsCodec } from '@/types/settings';

interface Color {
	r: number;
	g: number;
	b: number;
	a: number;
}

type StoredStyle = Record<string, { value: string; priority: string }>;

/** Stable DOM markers used by every Dark Mode Lite browser integration. */
export const DARK_MODE_DOM = {
	styleId: 'dark-mode-lite-style',
	rootAttribute: 'data-dm-lite-active',
	modeAttribute: 'data-dm-lite-mode',
} as const;

/**
 * Applies and removes Dark Mode Lite styling without depending on a browser
 * extension runtime.
 */
export class DarkModeEngine {
	private static readonly LEGACY_STYLE_ID = 'personal-dark-mode-lite-style';
	private static readonly LEGACY_ROOT_ATTR = 'data-pdm-lite-active';
	private static readonly LEGACY_MODE_ATTR = 'data-pdm-lite-mode';
	private static readonly SKIPPABLE_TAGS = ['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'IMG', 'VIDEO', 'PICTURE', 'CANVAS', 'SVG', 'PATH', 'IFRAME'];

	private settings: Settings | null = null;
	private active = false;
	private smartObserver: MutationObserver | null = null;
	private smartScanTimer = 0;

	private readonly originalStyles = new Map<HTMLElement, StoredStyle>();

	/**
	 * Apply normalized settings to the current document.
	 *
	 * @param input - Persisted or wire-protocol settings.
	 * @param active - Whether the selected tab and host are currently enabled.
	 */
	apply(input: unknown, active: boolean) {
		const previousMode = this.settings?.mode;
		const nextSettings = SettingsCodec.migrateSettings(input);

		this.settings = nextSettings;
		this.active = active;

		const root = document.documentElement;

		this.cleanupLegacyNamespace(root);

		const style = this.ensureStyle();
		const mode = this.normalizeMode(nextSettings.mode);

		style.textContent = this.createCSS(nextSettings);
		root.setAttribute(DARK_MODE_DOM.modeAttribute, mode);

		if (previousMode === 'smart' && (!active || mode !== 'smart')) {
			this.stopSmartMode();
		}

		if (active) {
			root.setAttribute(DARK_MODE_DOM.rootAttribute, 'true');
			if (mode === 'smart') {
				this.startSmartMode();
			}
		} else {
			root.removeAttribute(DARK_MODE_DOM.rootAttribute);
			this.stopSmartMode();
		}
	}

	/** Remove every style and marker owned by the engine. */
	dispose() {
		this.active = false;
		this.stopSmartMode();

		const root = document.documentElement;

		root.removeAttribute(DARK_MODE_DOM.rootAttribute);
		root.removeAttribute(DARK_MODE_DOM.modeAttribute);
		document.getElementById(DARK_MODE_DOM.styleId)?.remove();
		this.cleanupLegacyNamespace(root);
		this.settings = null;
	}

	private normalizeMode(mode: ThemeMode): ThemeMode {
		return mode === 'smart' || mode === 'invert' || mode === 'soft' ? mode : 'smart';
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
			if (!element.style) {
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
		return DarkModeEngine.SKIPPABLE_TAGS.includes(element.tagName);
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

		if (!this.active || this.settings?.mode !== 'smart') {
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

	private cleanupLegacyNamespace(root = document.documentElement) {
		document.getElementById(DarkModeEngine.LEGACY_STYLE_ID)?.remove();
		root.removeAttribute(DarkModeEngine.LEGACY_ROOT_ATTR);
		root.removeAttribute(DarkModeEngine.LEGACY_MODE_ATTR);
	}

	private ensureStyle() {
		const existingStyle = document.getElementById(DARK_MODE_DOM.styleId);

		if (existingStyle instanceof HTMLStyleElement) {
			return existingStyle;
		}

		const style = document.createElement('style');

		style.id = DARK_MODE_DOM.styleId;
		style.setAttribute('data-owner', 'dark-mode-lite');
		(document.documentElement || document.head || document).appendChild(style);

		return style;
	}

	private createCSS(nextSettings: Settings) {
		const brightness = this.clamp(nextSettings.brightness, 50, 150);
		const contrast = this.clamp(nextSettings.contrast, 50, 150);
		const sepia = this.clamp(nextSettings.sepia, 0, 100);
		const rootAttribute = DARK_MODE_DOM.rootAttribute;
		const modeAttribute = DARK_MODE_DOM.modeAttribute;

		return `
      html[${rootAttribute}="true"] {
        color-scheme: dark !important;
        --dm-lite-bg: #111318;
        --dm-lite-surface: #1a1d24;
        --dm-lite-surface-2: #232833;
        --dm-lite-text: #e9edf5;
        --dm-lite-muted: #aab2c2;
        --dm-lite-link: #8ab4ff;
        --dm-lite-border: rgba(255, 255, 255, 0.22);
      }

      html[${rootAttribute}="true"][${modeAttribute}="smart"],
      html[${rootAttribute}="true"][${modeAttribute}="smart"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="smart"] :where(
        p, span, li, label, strong, em, small, h1, h2, h3, h4, h5, h6,
        code, pre, th, td
      ) {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="smart"] :where(a, a *) {
        color: var(--dm-lite-link) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="smart"] :where(
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

      html[${rootAttribute}="true"][${modeAttribute}="smart"] img,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] video,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] picture,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] canvas,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] svg,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] iframe {
        filter: brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="smart"] input,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] textarea,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] select,
      html[${rootAttribute}="true"][${modeAttribute}="smart"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="invert"] {
        background: white !important;
        filter: invert(1) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="invert"] img,
      html[${rootAttribute}="true"][${modeAttribute}="invert"] video,
      html[${rootAttribute}="true"][${modeAttribute}="invert"] picture,
      html[${rootAttribute}="true"][${modeAttribute}="invert"] canvas,
      html[${rootAttribute}="true"][${modeAttribute}="invert"] iframe,
      html[${rootAttribute}="true"][${modeAttribute}="invert"] svg,
      html[${rootAttribute}="true"][${modeAttribute}="invert"] [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"],
      html[${rootAttribute}="true"][${modeAttribute}="soft"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"] body,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] main,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] article,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] section,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] aside,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] header,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] footer,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] nav,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] div,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] form,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] dialog {
        background-color: var(--dm-lite-bg) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"] p,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] span,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] li,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] label,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] strong,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] em,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] h1,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] h2,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] h3,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] h4,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] h5,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] h6,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] code,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] pre,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] table,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] th,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] td {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"] a {
        color: var(--dm-lite-link) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"] input,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] textarea,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] select,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"] input::placeholder,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] textarea::placeholder {
        color: var(--dm-lite-muted) !important;
      }

      html[${rootAttribute}="true"][${modeAttribute}="soft"] pre,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] code,
      html[${rootAttribute}="true"][${modeAttribute}="soft"] blockquote {
        background-color: var(--dm-lite-surface-2) !important;
      }
    `;
	}
}
