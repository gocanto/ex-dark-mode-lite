import { defineConfig } from '@playwright/test';

const localArtifactRoot = '/Users/gocanto/.codex/cache/codex/browser-artifacts';
const artifactRoot = process.env.PLAYWRIGHT_ARTIFACTS_DIR ?? localArtifactRoot;

export default defineConfig({
	testDir: 'e2e',
	outputDir: artifactRoot,
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: [['list']],
	timeout: 60_000,
	expect: {
		timeout: 5_000,
	},
	use: {
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
	},
});
