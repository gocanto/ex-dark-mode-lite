import { describe, expect, it } from 'vite-plus/test';
import { ManagedTabRegistry } from '@controller/ManagedTabRegistry';
import { DEFAULT_SETTINGS } from '@/types/settings';

describe('managed tab registry', () => {
	it('manages HTTP tabs and honors global and host settings', () => {
		const registry = new ManagedTabRegistry();

		registry.manage(7);

		expect(registry.shouldApply(7, 'https://www.example.com/path')).toBe(true);
		expect(registry.shouldApply(8, 'https://example.com')).toBe(false);
		expect(registry.shouldApply(7, 'chrome://extensions')).toBe(false);

		registry.replaceSettings(1, {
			...DEFAULT_SETTINGS,
			siteOverrides: { 'example.com': false },
		});

		expect(registry.shouldApply(7, 'https://www.example.com/path')).toBe(false);

		registry.replaceSettings(2, {
			...DEFAULT_SETTINGS,
			enabled: false,
		});

		expect(registry.shouldApply(7, 'https://example.com')).toBe(false);
	});

	it('rejects stale revisions and restores only valid tab identifiers', () => {
		const registry = new ManagedTabRegistry();

		registry.restore({
			revision: 5,
			settings: { ...DEFAULT_SETTINGS, mode: 'soft' },
			managedTabIds: [4, -1, 2, '3'],
		});

		expect(registry.snapshot()).toEqual({
			revision: 5,
			settings: { ...DEFAULT_SETTINGS, mode: 'soft' },
			managedTabIds: [2, 4],
		});
		expect(registry.replaceSettings(4, { ...DEFAULT_SETTINGS, mode: 'invert' })).toBe(false);
		expect(registry.snapshot().settings.mode).toBe('soft');
	});

	it('removes closed or explicitly disabled tabs from snapshots', () => {
		const registry = new ManagedTabRegistry();

		registry.manage(9);
		registry.manage(3);
		registry.unmanage(9);

		expect(registry.snapshot().managedTabIds).toEqual([3]);
	});
});
