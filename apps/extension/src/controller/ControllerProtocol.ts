import type { Settings } from '@/types/settings';
import { SettingsCodec } from '@/types/settings';

/** Wire-protocol version shared with the native macOS controller. */
export const CONTROLLER_PROTOCOL_VERSION = 1;

/** Loopback endpoint exposed by the native menu-bar app. */
export const CONTROLLER_BRIDGE_URL = 'ws://127.0.0.1:59387/v1';

/** Browser families certified by the native controller. */
export type BrowserFamily = 'safari' | 'chromium' | 'firefox';

/** A browser tab safe to display after pairing. */
export interface BrowserTab {
	readonly tabId: number;
	readonly windowId: number;
	readonly title: string;
	readonly url: string;
	readonly active: boolean;
	readonly injectable: boolean;
}

/** State cached by a companion extension for a managed browser tab. */
export interface ControllerState {
	readonly revision: number;
	readonly settings: Settings;
	readonly managedTabIds: ReadonlyArray<number>;
}

/** Commands accepted from the native app after protocol parsing. */
export type NativeControllerCommand =
	| { readonly version: 1; readonly type: 'hello.accepted' }
	| { readonly version: 1; readonly type: 'pairing.accepted'; readonly token: string }
	| { readonly version: 1; readonly type: 'settings.replace'; readonly revision: number; readonly settings: Settings }
	| { readonly version: 1; readonly type: 'tab.manage'; readonly requestId: string; readonly tabId: number }
	| { readonly version: 1; readonly type: 'tab.unmanage'; readonly requestId: string; readonly tabId: number }
	| { readonly version: 1; readonly type: 'state.request'; readonly requestId: string }
	| { readonly version: 1; readonly type: 'ping'; readonly sentAt: number }
	| { readonly version: 1; readonly type: 'error'; readonly requestId: string | null; readonly code: string; readonly message: string };

/** Events emitted by a paired or pairing companion extension. */
export type ControllerExtensionEvent =
	| {
			readonly version: 1;
			readonly type: 'hello';
			readonly clientId: string;
			readonly browserFamily: BrowserFamily;
			readonly browserVersion: string;
			readonly extensionVersion: string;
			readonly token: string | null;
	  }
	| {
			readonly version: 1;
			readonly type: 'tabs.snapshot';
			readonly clientId: string;
			readonly tabs: ReadonlyArray<BrowserTab>;
	  }
	| {
			readonly version: 1;
			readonly type: 'state.snapshot';
			readonly requestId: string | null;
			readonly clientId: string;
			readonly state: ControllerState;
	  }
	| {
			readonly version: 1;
			readonly type: 'settings.proposal';
			readonly clientId: string;
			readonly baseRevision: number;
			readonly settings: Settings;
	  }
	| { readonly version: 1; readonly type: 'heartbeat'; readonly sentAt: number }
	| { readonly version: 1; readonly type: 'pong'; readonly sentAt: number }
	| { readonly version: 1; readonly type: 'error'; readonly requestId: string | null; readonly code: string; readonly message: string };

/** Parses untrusted native-controller messages into the supported command union. */
export class ControllerProtocolCodec {
	/**
	 * Parse a JSON-decoded native command.
	 *
	 * @param input - Untrusted WebSocket payload.
	 * @returns A normalized command, or null for malformed/unsupported input.
	 */
	static parseNativeCommand(input: unknown): NativeControllerCommand | null {
		if (!ControllerProtocolCodec.isRecord(input) || input.version !== CONTROLLER_PROTOCOL_VERSION || typeof input.type !== 'string') {
			return null;
		}

		if (input.type === 'pairing.accepted' && ControllerProtocolCodec.isNonEmptyString(input.token)) {
			return { version: 1, type: 'pairing.accepted', token: input.token };
		}

		if (input.type === 'hello.accepted') {
			return { version: 1, type: 'hello.accepted' };
		}

		if (input.type === 'settings.replace') {
			const revision = ControllerProtocolCodec.parseNonNegativeInteger(input.revision);

			if (revision === null || !ControllerProtocolCodec.isRecord(input.settings)) {
				return null;
			}

			return {
				version: 1,
				type: 'settings.replace',
				revision,
				settings: SettingsCodec.migrateSettings(input.settings),
			};
		}

		if (input.type === 'tab.manage' || input.type === 'tab.unmanage') {
			const tabId = ControllerProtocolCodec.parseNonNegativeInteger(input.tabId);

			if (!ControllerProtocolCodec.isNonEmptyString(input.requestId) || tabId === null) {
				return null;
			}

			return {
				version: 1,
				type: input.type,
				requestId: input.requestId,
				tabId,
			};
		}

		if (input.type === 'state.request' && ControllerProtocolCodec.isNonEmptyString(input.requestId)) {
			return { version: 1, type: 'state.request', requestId: input.requestId };
		}

		if (input.type === 'ping') {
			const sentAt = ControllerProtocolCodec.parseNonNegativeInteger(input.sentAt);

			return sentAt === null ? null : { version: 1, type: 'ping', sentAt };
		}

		if (
			input.type === 'error' &&
			(input.requestId === null || ControllerProtocolCodec.isNonEmptyString(input.requestId)) &&
			ControllerProtocolCodec.isNonEmptyString(input.code) &&
			ControllerProtocolCodec.isNonEmptyString(input.message)
		) {
			return {
				version: 1,
				type: 'error',
				requestId: input.requestId,
				code: input.code,
				message: input.message,
			};
		}

		return null;
	}

	/** Parse a JSON WebSocket payload without throwing into the runtime loop. */
	static parseJSON(input: string): NativeControllerCommand | null {
		try {
			return ControllerProtocolCodec.parseNativeCommand(JSON.parse(input));
		} catch {
			return null;
		}
	}

	private static isRecord(input: unknown): input is Record<string, unknown> {
		return typeof input === 'object' && input !== null && !Array.isArray(input);
	}

	private static isNonEmptyString(input: unknown): input is string {
		return typeof input === 'string' && input.length > 0;
	}

	private static parseNonNegativeInteger(input: unknown) {
		return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 ? input : null;
	}
}
