import { Results, type Result } from '@lib/result';
import type { ExtensionState, PopupMessage } from '@/types/settings';
import { SettingsCodec } from '@/types/settings';

/** Minimal Chrome APIs used by the popup runtime adapter. */
export interface ChromeRuntimeApi {
	readonly tabs?: {
		query(options: chrome.tabs.QueryInfo): Promise<ReadonlyArray<{ readonly id?: number | undefined; readonly url?: string | undefined }>>;
		sendMessage(tabId: number, message: PopupMessage, callback: (response: unknown) => void): void;
	};
	readonly storage?: typeof chrome.storage;
	readonly scripting?: {
		executeScript(details: { target: { tabId: number; allFrames: boolean }; files: string[] }): Promise<unknown>;
	};
	readonly runtime?: {
		readonly lastError: chrome.runtime.LastError | undefined;
	};
}

/** Expected runtime failure when there is no active browser tab. */
export class NoActiveTab extends Error {
	readonly _tag = 'NoActiveTab';

	constructor() {
		super('No active tab');
	}
}

/** Expected runtime failure when a tab message cannot be delivered or parsed. */
export class TabMessageFailed extends Error {
	readonly _tag = 'TabMessageFailed';

	constructor(
		readonly reason: 'runtime-error' | 'invalid-response',
		readonly detail: unknown,
	) {
		super(reason === 'runtime-error' ? String(detail || 'Tab unavailable') : 'Invalid tab response');
	}
}

/** Expected runtime failure when the content script cannot be injected. */
export class ContentScriptInjectionFailed extends Error {
	readonly _tag = 'ContentScriptInjectionFailed';

	constructor(readonly detail: unknown) {
		super('Content script unavailable');
	}
}

/** Expected Chrome runtime failures handled by the popup controller. */
export type PopupRuntimeError = NoActiveTab | TabMessageFailed | ContentScriptInjectionFailed;

/** Adapts the Chrome extension APIs the popup depends on into typed results. */
export class ChromeRuntimeAdapter {
	constructor(private readonly runtime: ChromeRuntimeApi | undefined = ChromeRuntimeAdapter.resolveRuntime()) {}

	/** Check whether the required extension APIs are available. */
	isExtensionRuntimeAvailable() {
		return Boolean(this.runtime?.tabs && this.runtime.storage && this.runtime.scripting);
	}

	/** Query the active tab from the current Chrome window. */
	async queryActiveTab() {
		const [tab] = (await this.runtime?.tabs?.query({ active: true, currentWindow: true })) ?? [];

		return {
			id: tab?.id ?? null,
			url: tab?.url ?? '',
		};
	}

	/** Send a typed popup message to the active tab. */
	sendToTab(tabId: number | null, message: PopupMessage): Promise<Result<ExtensionState, NoActiveTab | TabMessageFailed>> {
		const runtime = this.runtime;

		return new Promise((resolve) => {
			if (!tabId) {
				resolve(Results.err(new NoActiveTab()));

				return;
			}

			if (!runtime?.tabs) {
				resolve(Results.err(new TabMessageFailed('runtime-error', 'Extension runtime unavailable')));

				return;
			}

			runtime.tabs.sendMessage(tabId, message, (response: unknown) => {
				const error = runtime.runtime?.lastError;

				if (error) {
					resolve(Results.err(new TabMessageFailed('runtime-error', error.message)));

					return;
				}

				const state = SettingsCodec.parseExtensionState(response);

				if (!state) {
					resolve(Results.err(new TabMessageFailed('invalid-response', response)));

					return;
				}

				resolve(Results.ok(state));
			});
		});
	}

	/** Inject the extension content script into the active tab. */
	async injectContentScript(tabId: number | null): Promise<Result<void, NoActiveTab | ContentScriptInjectionFailed>> {
		if (!tabId) {
			return Results.err(new NoActiveTab());
		}

		try {
			await this.runtime?.scripting?.executeScript({
				target: { tabId, allFrames: true },
				files: ['content.js'],
			});

			return Results.ok(undefined);
		} catch (error) {
			return Results.err(new ContentScriptInjectionFailed(error));
		}
	}

	private static resolveRuntime(): ChromeRuntimeApi | undefined {
		return typeof chrome === 'undefined' ? undefined : chrome;
	}
}
