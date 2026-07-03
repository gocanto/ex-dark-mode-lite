import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE } from '@/types/settings';
import { ChromeRuntimeAdapter, ContentScriptInjectionFailed, NoActiveTab, TabMessageFailed, type ChromeRuntimeApi } from '@composables/PopupController/chromeRuntime';

describe('chrome runtime helpers', () => {
	it('returns parsed tab state for successful messages', async () => {
		const adapter = new ChromeRuntimeAdapter(
			createRuntime({
				response: {
					settings: {
						...DEFAULT_SETTINGS,
						mode: 'soft',
					},
					host: 'example.com',
					active: true,
					siteEnabled: true,
				},
			}),
		);

		const result = await adapter.sendToTab(1, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

		expect(result.isOk()).toBe(true);
		expect(result.isOk() && result.value).toEqual({
			settings: {
				...DEFAULT_SETTINGS,
				mode: 'soft',
			},
			host: 'example.com',
			active: true,
			siteEnabled: true,
		});
	});

	it('returns typed message failures', async () => {
		const noTab = await new ChromeRuntimeAdapter(createRuntime({})).sendToTab(null, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

		const runtimeError = await new ChromeRuntimeAdapter(createRuntime({ lastErrorMessage: 'Receiving end does not exist' })).sendToTab(1, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

		const invalidResponse = await new ChromeRuntimeAdapter(createRuntime({ response: null })).sendToTab(1, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

		expect(noTab.isErr()).toBe(true);
		expect(noTab.isErr() && noTab.error).toBeInstanceOf(NoActiveTab);
		expect(runtimeError.isErr()).toBe(true);
		expect(runtimeError.isErr() && runtimeError.error).toBeInstanceOf(TabMessageFailed);
		expect(invalidResponse.isErr()).toBe(true);
		expect(invalidResponse.isErr() && invalidResponse.error).toBeInstanceOf(TabMessageFailed);
	});

	it('returns typed injection results', async () => {
		const success = await new ChromeRuntimeAdapter(createRuntime({})).injectContentScript(1);

		const noTab = await new ChromeRuntimeAdapter(createRuntime({})).injectContentScript(null);

		const failed = await new ChromeRuntimeAdapter(createRuntime({ injectionError: new Error('blocked') })).injectContentScript(1);

		expect(success.isOk()).toBe(true);
		expect(noTab.isErr()).toBe(true);
		expect(noTab.isErr() && noTab.error).toBeInstanceOf(NoActiveTab);
		expect(failed.isErr()).toBe(true);
		expect(failed.isErr() && failed.error).toBeInstanceOf(ContentScriptInjectionFailed);
	});
});

function createRuntime(options: { response?: unknown; lastErrorMessage?: string; injectionError?: Error }): ChromeRuntimeApi {
	return {
		runtime: {
			get lastError() {
				return options.lastErrorMessage === undefined ? undefined : { message: options.lastErrorMessage };
			},
		},
		tabs: {
			async query() {
				return [{ id: 1, url: 'https://example.com' }];
			},
			sendMessage(_tabId, _message, callback) {
				callback(options.response);
			},
		},
		scripting: {
			async executeScript() {
				if (options.injectionError) {
					throw options.injectionError;
				}
			},
		},
	};
}
