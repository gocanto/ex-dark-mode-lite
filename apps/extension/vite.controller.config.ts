import { resolve } from 'node:path';
import { defineConfig } from 'vite-plus';

const sourceRoot = resolve(__dirname, 'src');
const controllerEntry = process.env.DML_CONTROLLER_ENTRY === 'content' ? 'content' : 'background';
const entryPath = controllerEntry === 'content' ? resolve(sourceRoot, 'controllerContent.ts') : resolve(sourceRoot, 'controllerBackgroundEntry.ts');

export default defineConfig({
	publicDir: false,
	resolve: {
		alias: {
			'@': sourceRoot,
			'@content': resolve(sourceRoot, 'content'),
			'@controller': resolve(sourceRoot, 'controller'),
		},
	},
	build: {
		emptyOutDir: controllerEntry === 'background',
		outDir: 'controller-dist',
		rollupOptions: {
			input: entryPath,
			output: {
				codeSplitting: false,
				entryFileNames: `${controllerEntry}.js`,
				assetFileNames: '[name][extname]',
			},
		},
	},
});
