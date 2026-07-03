import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { defineConfig } from 'vite-plus';

const sourceRoot = resolve(__dirname, 'src');
const popupHtmlEntry = resolve(__dirname, 'index.html');
const contentScriptEntry = resolve(sourceRoot, 'content.ts');
const contentScriptOutput = 'content.js';

export default defineConfig({
	plugins: [vue(), tailwindcss()],
	resolve: {
		alias: {
			'@': sourceRoot,
			'@popup': resolve(sourceRoot, 'popup'),
			'@components': resolve(sourceRoot, 'popup/components'),
			'@composables': resolve(sourceRoot, 'popup/composables'),
			'@lib': resolve(sourceRoot, 'lib'),
			'@types': resolve(sourceRoot, 'types'),
		},
	},
	build: {
		emptyOutDir: true,
		rollupOptions: {
			input: {
				popup: popupHtmlEntry,
				content: contentScriptEntry,
			},
			output: {
				entryFileNames: (chunk) => (chunk.name === 'content' ? contentScriptOutput : 'assets/[name].js'),
				chunkFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
});
