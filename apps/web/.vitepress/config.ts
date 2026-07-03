import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig, type HeadConfig, type UserConfig } from 'vitepress';
import { AUTHOR_URL, SITE_DESCRIPTION, SITE_OG_DESCRIPTION, SITE_TITLE, SITE_URL } from '#web/config/site';

const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap';

const JSON_LD = JSON.stringify({
	'@context': 'https://schema.org',
	'@type': 'SoftwareApplication',
	name: 'Dark Mode Lite',
	description: SITE_DESCRIPTION,
	url: SITE_URL,
	image: OG_IMAGE_URL,
	applicationCategory: 'BrowserApplication',
	operatingSystem: 'Chrome',
	offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
	author: { '@type': 'Person', name: 'Gustavo Ocanto', url: AUTHOR_URL },
});

export default defineConfig({
	lang: 'en',
	title: SITE_TITLE,
	titleTemplate: false,
	description: SITE_DESCRIPTION,
	cleanUrls: true,
	sitemap: { hostname: SITE_URL },
	head: [
		['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo-a.svg' }],
		['meta', { name: 'theme-color', content: '#06080b' }],
		['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
		['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
		['link', { rel: 'stylesheet', href: GOOGLE_FONTS_URL }],
		['meta', { property: 'og:type', content: 'website' }],
		['meta', { property: 'og:site_name', content: 'Dark Mode Lite' }],
		['meta', { property: 'og:title', content: SITE_TITLE }],
		['meta', { property: 'og:description', content: SITE_OG_DESCRIPTION }],
		['meta', { property: 'og:image', content: OG_IMAGE_URL }],
		['meta', { property: 'og:image:width', content: '1400' }],
		['meta', { property: 'og:image:height', content: '560' }],
		['meta', { property: 'og:locale', content: 'en_US' }],
		['meta', { name: 'twitter:card', content: 'summary_large_image' }],
		['meta', { name: 'twitter:title', content: SITE_TITLE }],
		['meta', { name: 'twitter:description', content: SITE_OG_DESCRIPTION }],
		['meta', { name: 'twitter:image', content: OG_IMAGE_URL }],
		['script', { type: 'application/ld+json' }, JSON_LD],
	],
	transformHead({ pageData }): HeadConfig[] {
		const path = pageData.relativePath.replace(/(?:^|\/)index\.md$/, '').replace(/\.md$/, '');
		const canonicalUrl = path.length > 0 ? `${SITE_URL}/${path}` : `${SITE_URL}/`;

		return [
			['link', { rel: 'canonical', href: canonicalUrl }],
			['meta', { property: 'og:url', content: canonicalUrl }],
		];
	},
	// SAFETY: @tailwindcss/vite is typed against the repo's Vite 8 while VitePress bundles its own
	// Vite 5. The plugin's peer range (^5.2.0 || ^6 || ^7 || ^8) covers both, so only the two
	// copies of the Plugin type disagree — the cast bridges that identity mismatch, nothing else.
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				'@web': resolve(__dirname, '..', 'src'),
			},
		},
		// @dml/ui ships Vue/TS source (no build step), so it must be transformed
		// through this app's pipeline instead of externalized during SSG.
		ssr: {
			noExternal: ['@dml/ui'],
		},
	} as unknown as NonNullable<UserConfig['vite']>,
});
