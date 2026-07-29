import { describe, expect, it } from 'vite-plus/test';
import { ControllerProtocolCodec } from '@controller/ControllerProtocol';
import { DEFAULT_SETTINGS } from '@/types/settings';

describe('controller protocol parser', () => {
	it('parses and normalizes settings replacement commands', () => {
		expect(
			ControllerProtocolCodec.parseNativeCommand({
				version: 1,
				type: 'settings.replace',
				revision: 9,
				settings: {
					mode: 'soft',
					brightness: 999,
					siteOverrides: { 'www.example.com': false },
				},
			}),
		).toEqual({
			version: 1,
			type: 'settings.replace',
			revision: 9,
			settings: {
				...DEFAULT_SETTINGS,
				mode: 'soft',
				brightness: 150,
				siteOverrides: { 'example.com': false },
			},
		});
	});

	it('parses pairing, tab, state, and heartbeat commands', () => {
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'hello.accepted' })).toEqual({ version: 1, type: 'hello.accepted' });
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'pairing.accepted', token: 'token' })).toEqual({
			version: 1,
			type: 'pairing.accepted',
			token: 'token',
		});
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'tab.manage', requestId: 'r1', tabId: 42 })).toEqual({
			version: 1,
			type: 'tab.manage',
			requestId: 'r1',
			tabId: 42,
		});
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'state.request', requestId: 'r2' })).toEqual({
			version: 1,
			type: 'state.request',
			requestId: 'r2',
		});
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'ping', sentAt: 10 })).toEqual({ version: 1, type: 'ping', sentAt: 10 });
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'error', requestId: null, code: 'invalid-event', message: 'Malformed event.' })).toEqual({
			version: 1,
			type: 'error',
			requestId: null,
			code: 'invalid-event',
			message: 'Malformed event.',
		});
	});

	it('rejects malformed JSON, unsupported versions, and invalid identifiers', () => {
		expect(ControllerProtocolCodec.parseJSON('{')).toBeNull();
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 2, type: 'hello.accepted' })).toBeNull();
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'pairing.accepted', token: '' })).toBeNull();
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'tab.manage', requestId: '', tabId: -1 })).toBeNull();
		expect(ControllerProtocolCodec.parseNativeCommand({ version: 1, type: 'error', requestId: null, code: '', message: 'bad' })).toBeNull();
	});
});
