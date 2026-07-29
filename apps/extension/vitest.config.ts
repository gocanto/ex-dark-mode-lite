import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Standalone Vitest config. It re-declares the same aliases as vite.config.ts
// (kept in sync with tsconfig "paths") so unit/feature tests resolve repo
// aliases without pulling in the build-only Vite plugins.
const sourceRoot = resolve(__dirname, 'src');

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': sourceRoot,
			'@popup': resolve(sourceRoot, 'popup'),
			'@components': resolve(sourceRoot, 'popup/components'),
			'@composables': resolve(sourceRoot, 'popup/composables'),
			'@content': resolve(sourceRoot, 'content'),
			'@controller': resolve(sourceRoot, 'controller'),
			'@lib': resolve(sourceRoot, 'lib'),
			'@types': resolve(sourceRoot, 'types'),
		},
	},
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node',
		coverage: {
			// Measures code exercised by the unit/feature suite (Vitest default,
			// all:false). The gate keeps tested code at >= 50%; it is not an
			// all-source metric because the Vue UI layer has no unit tests yet.
			provider: 'v8',
			reporter: ['text', 'text-summary', 'json-summary'],
			// Write to the repo-root coverage/ dir so the CI coverage gate keeps
			// reading coverage/coverage-summary.json from the workspace root.
			reportsDirectory: resolve(__dirname, '..', '..', 'coverage'),
			exclude: ['src/**/*.{test,spec}.ts', 'src/**/*.d.ts'],
			thresholds: {
				lines: 50,
				functions: 50,
				branches: 50,
			},
		},
	},
});
