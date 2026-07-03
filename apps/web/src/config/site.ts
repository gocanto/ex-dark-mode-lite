/**
 * Production origin of the marketing site, without a trailing slash.
 * Sitemap, canonical links, and OG URLs all derive from this constant
 * (robots.txt must be updated by hand).
 */
export const SITE_URL = 'https://dark-mode.link';

/** Browser-tab, OG, and Twitter title. */
export const SITE_TITLE = 'Dark Mode Lite — Dark mode for every site';

/** Meta description for search engines. */
export const SITE_DESCRIPTION =
	'Dark Mode Lite is a free Chrome extension that gives every website a beautiful dark theme — smart contrast tuning, saved presets, per-site control. No account, no tracking.';

/** Shorter description used for OG and Twitter cards. */
export const SITE_OG_DESCRIPTION = 'A free Chrome extension that rewrites each page as you land on it — matching contrast to content, not just flipping colors.';

/** Chrome Web Store listing URL. */
export const CHROME_STORE_URL = 'https://chromewebstore.google.com/';

/** Author site linked from the nav and footer. */
export const AUTHOR_URL = 'https://gocanto.sh';

/** Privacy policy page path (the URL shared with the Chrome Web Store). */
export const PRIVACY_PATH = '/privacy';

/** Terms of use page path. */
export const TERMS_PATH = '/terms';
