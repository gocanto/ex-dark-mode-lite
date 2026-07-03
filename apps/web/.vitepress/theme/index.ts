import type { Theme } from 'vitepress';
import Layout from '@web/Layout.vue';
import '@web/assets/main.css';

/**
 * Our landing-page theme sits on top of the VitePress engine: VitePress owns
 * routing/SSG/markdown, while this custom Layout owns the entire presentation.
 * We intentionally do NOT extend the default theme — layering its stylesheet on
 * top fights our design tokens (e.g. it recolors nav links).
 */
const theme: Theme = { Layout };

export default theme;
