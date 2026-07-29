import { resolve } from 'node:path';
import { defineConfig } from 'vite-plus';

const sourceRoot = resolve(__dirname, 'src');

export default defineConfig({
	publicDir: false,
	resolve: {
		alias: {
			'@': sourceRoot,
			'@content': resolve(sourceRoot, 'content'),
		},
	},
	build: {
		emptyOutDir: false,
		outDir: 'dist',
		rollupOptions: {
			input: resolve(sourceRoot, 'content.ts'),
			output: {
				codeSplitting: false,
				entryFileNames: 'content.js',
				assetFileNames: '[name][extname]',
			},
		},
	},
});
