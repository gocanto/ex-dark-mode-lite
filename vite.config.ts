import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	plugins: [
		vue(),
		tailwindcss(),
		{
			name: 'extension-manifest',
			generateBundle() {
				this.emitFile({
					type: 'asset',
					fileName: 'manifest.json',
					source: readFileSync(resolve(__dirname, 'manifest.json'), 'utf8'),
				});
			},
		},
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	build: {
		emptyOutDir: true,
		rollupOptions: {
			input: {
				popup: resolve(__dirname, 'popup/index.html'),
				content: resolve(__dirname, 'src/content.ts'),
			},
			output: {
				entryFileNames: (chunk) => (chunk.name === 'content' ? 'src/content.js' : 'assets/[name].js'),
				chunkFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
	fmt: {
		semi: true,
		singleQuote: false,
	},
});
