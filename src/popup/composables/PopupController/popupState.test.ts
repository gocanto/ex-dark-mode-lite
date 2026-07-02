import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { PopupStateBuilder } from '@composables/PopupController/popupState';

describe('popup state helpers', () => {
	it('extracts normalized hosts from tab URLs', () => {
		expect(PopupStateBuilder.getActiveHost('https://www.example.com/path')).toBe('example.com');
		expect(PopupStateBuilder.getActiveHost('notaurl')).toBe('');
		expect(PopupStateBuilder.getActiveHost('')).toBe('');
	});

	it('checks injectable tab URLs', () => {
		expect(PopupStateBuilder.canInjectIntoTab('https://example.com')).toBe(true);
		expect(PopupStateBuilder.canInjectIntoTab('http://example.com')).toBe(true);
		expect(PopupStateBuilder.canInjectIntoTab('chrome://extensions')).toBe(false);
		expect(PopupStateBuilder.canInjectIntoTab('notaurl')).toBe(false);
		expect(PopupStateBuilder.canInjectIntoTab('')).toBe(false);
	});

	it('builds popup state from settings and tab URL', () => {
		expect(
			PopupStateBuilder.buildPopupState(
				{
					...DEFAULT_SETTINGS,
					siteOverrides: {
						'example.com': false,
					},
				},
				'https://www.example.com/path',
			),
		).toEqual({
			settings: {
				...DEFAULT_SETTINGS,
				siteOverrides: {
					'example.com': false,
				},
			},
			host: 'example.com',
			active: false,
			siteEnabled: false,
		});
	});
});
