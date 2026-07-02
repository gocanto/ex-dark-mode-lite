import { describe, expect, it } from 'vitest';
import { BUILT_IN_PRESETS, DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE, SettingsCodec } from '@/types/settings';

describe('settings parsers', () => {
	it('fills defaults around valid stored settings', () => {
		const settings = SettingsCodec.parseSettings({
			enabled: false,
			mode: 'soft',
			brightness: 120,
			contrast: 88,
			sepia: 12,
			siteOverrides: {
				'www.example.com': false,
				'invalid.example': 'off',
			},
		});

		expect(settings).toEqual({
			...DEFAULT_SETTINGS,
			enabled: false,
			mode: 'soft',
			brightness: 120,
			contrast: 88,
			sepia: 12,
			siteOverrides: {
				'example.com': false,
			},
		});
	});

	it('normalizes invalid values safely', () => {
		expect(
			SettingsCodec.parseSettings({
				enabled: 'yes',
				mode: 'unknown',
				brightness: 1000,
				contrast: 'high',
				sepia: -20,
				siteOverrides: null,
			}),
		).toEqual({
			...DEFAULT_SETTINGS,
			brightness: 150,
			sepia: 0,
		});
	});

	it('preserves legacy invert migration behavior', () => {
		expect(SettingsCodec.parseSettings({ mode: 'invert' }).mode).toBe('smart');
		expect(SettingsCodec.parseSettings({ mode: 'invert', settingsVersion: 2 }).mode).toBe('invert');
	});

	it('parses theme modes and settings patches from unknown input', () => {
		expect(SettingsCodec.parseThemeMode('invert')).toBe('invert');
		expect(SettingsCodec.parseThemeMode('invalid')).toBe(DEFAULT_SETTINGS.mode);
		expect(SettingsCodec.parseSettingsPatch({ mode: 'soft', brightness: 40, siteOverrides: { 'www.site.test': true } })).toEqual({
			mode: 'soft',
			brightness: 50,
			siteOverrides: {
				'site.test': true,
			},
		});
	});
});

describe('preset parsers', () => {
	it('has default settings that reference the default preset', () => {
		expect(DEFAULT_SETTINGS.activePresetId).toBe('default');
		expect(DEFAULT_SETTINGS.customPresets).toEqual([]);
		expect(BUILT_IN_PRESETS.some((preset) => preset.id === 'default')).toBe(true);
	});

	it('parses a valid preset and coerces builtin to false', () => {
		expect(SettingsCodec.parseThemePreset({ id: 'custom-1', name: 'Mine', mode: 'soft', brightness: 90, contrast: 80, sepia: 10, dot: '#fff', builtin: true })).toEqual({
			id: 'custom-1',
			name: 'Mine',
			mode: 'soft',
			brightness: 90,
			contrast: 80,
			sepia: 10,
			dot: '#fff',
			builtin: false,
		});
	});

	it('rejects presets without a usable id', () => {
		expect(SettingsCodec.parseThemePreset({ name: 'no id' })).toBeNull();
		expect(SettingsCodec.parseThemePreset({ id: '' })).toBeNull();
		expect(SettingsCodec.parseThemePreset(null)).toBeNull();
	});

	it('drops invalid and duplicate custom presets, clamping numbers', () => {
		const settings = SettingsCodec.parseSettings({
			customPresets: [{ id: 'a', brightness: 1000 }, { id: 'a', name: 'dup' }, { bad: true }, 'nope'],
			activePresetId: 'a',
		});

		expect(settings.customPresets).toEqual([
			{
				id: 'a',
				name: 'a',
				mode: DEFAULT_SETTINGS.mode,
				brightness: 150,
				contrast: DEFAULT_SETTINGS.contrast,
				sepia: DEFAULT_SETTINGS.sepia,
				dot: '#2FE0CE',
				builtin: false,
			},
		]);
		expect(settings.activePresetId).toBe('a');
	});

	it('normalizes an invalid activePresetId to null', () => {
		expect(SettingsCodec.parseSettings({ activePresetId: 123 }).activePresetId).toBeNull();
		expect(SettingsCodec.parseSettings({ activePresetId: '' }).activePresetId).toBeNull();
	});

	it('round-trips presets through parseSettingsPatch', () => {
		const preset = { id: 'custom-9', name: 'Nine', mode: 'invert' as const, brightness: 110, contrast: 95, sepia: 5, dot: '#abc', builtin: false };
		const patch = SettingsCodec.parseSettingsPatch({ customPresets: [preset], activePresetId: 'custom-9' });

		expect(patch.customPresets).toEqual([preset]);
		expect(patch.activePresetId).toBe('custom-9');
	});
});

describe('popup message parser', () => {
	it('accepts known messages and parses patches', () => {
		expect(SettingsCodec.parsePopupMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' })).toEqual({
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'get-state',
		});

		expect(SettingsCodec.parsePopupMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'set-settings', patch: { mode: 'soft', sepia: 25 } })).toEqual({
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'set-settings',
			patch: {
				mode: 'soft',
				sepia: 25,
			},
		});
	});

	it('rejects unrelated messages', () => {
		expect(SettingsCodec.parsePopupMessage({ source: 'other-extension', type: 'get-state' })).toBeNull();
		expect(SettingsCodec.parsePopupMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'unknown' })).toBeNull();
		expect(SettingsCodec.parsePopupMessage(null)).toBeNull();
	});
});
