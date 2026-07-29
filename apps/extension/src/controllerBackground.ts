import type { BrowserFamily, BrowserTab, ControllerExtensionEvent, NativeControllerCommand } from '@controller/ControllerProtocol';
import { CONTROLLER_BRIDGE_URL, CONTROLLER_PROTOCOL_VERSION, ControllerProtocolCodec } from '@controller/ControllerProtocol';
import { ManagedTabRegistry } from '@controller/ManagedTabRegistry';

const CONTENT_MESSAGE_SOURCE = 'dark-mode-lite-controller';
const STORAGE_STATE_KEY = 'darkModeLiteControllerState';
const STORAGE_TOKEN_KEY = 'darkModeLiteControllerToken';
const STORAGE_CLIENT_ID_KEY = 'darkModeLiteControllerClientId';
const STORAGE_PROPOSAL_KEY = 'darkModeLiteControllerProposalPending';
const RECONNECT_ALARM_NAME = 'dark-mode-lite-controller-reconnect';
const RECONNECT_DELAY_MS = 2_000;
const RECONNECT_ALARM_MINUTES = 0.5;
const HEARTBEAT_DELAY_MS = 20_000;

interface StoredControllerData {
	readonly darkModeLiteControllerState?: unknown;
	readonly darkModeLiteControllerToken?: unknown;
	readonly darkModeLiteControllerClientId?: unknown;
	readonly darkModeLiteControllerProposalPending?: unknown;
}

/** Browser API boundary used by the controller bridge. */
export class CompanionBrowserRuntime {
	/** Read the controller cache from extension-local storage. */
	readStorage(): Promise<StoredControllerData> {
		return new Promise((resolve) => chrome.storage.local.get([STORAGE_STATE_KEY, STORAGE_TOKEN_KEY, STORAGE_CLIENT_ID_KEY, STORAGE_PROPOSAL_KEY], (value) => resolve(value)));
	}

	/** Persist one or more controller cache fields. */
	writeStorage(value: Record<string, unknown>) {
		return new Promise<void>((resolve) => chrome.storage.local.set(value, resolve));
	}

	/** Ensure a suspended MV3 worker wakes and reconnects to the native app. */
	scheduleReconnectAlarm() {
		chrome.alarms.create(RECONNECT_ALARM_NAME, { delayInMinutes: RECONNECT_ALARM_MINUTES });
	}

	/** Remove a pending reconnect alarm after a live socket is established. */
	clearReconnectAlarm() {
		void chrome.alarms.clear(RECONNECT_ALARM_NAME);
	}

	/** Return safe tab metadata; private tabs are intentionally excluded. */
	queryTabs(): Promise<BrowserTab[]> {
		return new Promise((resolve) => {
			chrome.tabs.query({}, (tabs) => {
				resolve(
					tabs.flatMap((tab) => {
						if (tab.incognito || tab.id === undefined || tab.windowId === undefined) {
							return [];
						}

						const url = tab.url ?? '';
						const injectable = CompanionBrowserRuntime.isInjectableURL(url);

						if (!injectable) {
							return [];
						}

						return [
							{
								tabId: tab.id,
								windowId: tab.windowId,
								title: tab.title ?? url,
								url,
								active: tab.active,
								injectable,
							},
						];
					}),
				);
			});
		});
	}

	/** Return non-private open tab IDs without exposing their page metadata. */
	queryOpenTabIds(): Promise<Set<number>> {
		return new Promise((resolve) => {
			chrome.tabs.query({}, (tabs) => {
				resolve(new Set(tabs.flatMap((tab) => (!tab.incognito && tab.id !== undefined ? [tab.id] : []))));
			});
		});
	}

	/** Send the current engine command to every frame in one tab. */
	sendToTab(tabId: number, message: unknown): Promise<boolean> {
		return new Promise((resolve) => {
			chrome.tabs.sendMessage(tabId, message, () => {
				const error = chrome.runtime.lastError;

				resolve(error === undefined);
			});
		});
	}

	/** Current extension version from the installed package manifest. */
	extensionVersion() {
		return chrome.runtime.getManifest().version;
	}

	/** Current browser family inferred without browser-specific globals. */
	browserFamily(): BrowserFamily {
		const userAgent = navigator.userAgent;

		if (userAgent.includes('Firefox/')) {
			return 'firefox';
		}

		if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/') && !userAgent.includes('Chromium/')) {
			return 'safari';
		}

		return 'chromium';
	}

	/** Human-readable browser version safe to expose after the local handshake. */
	browserVersion() {
		const match = navigator.userAgent.match(/(?:Firefox|Chrome|Version)\/([\d.]+)/);

		return match?.[1] ?? 'unknown';
	}

	private static isInjectableURL(url: string) {
		try {
			const parsed = new URL(url);

			return parsed.protocol === 'http:' || parsed.protocol === 'https:';
		} catch {
			return false;
		}
	}
}

/** Connects a companion WebExtension to the native Dark Mode Lite app. */
export class NativeControllerBridge {
	private readonly registry = new ManagedTabRegistry();

	private socket: WebSocket | null = null;
	private reconnectTimer = 0;
	private heartbeatTimer = 0;
	private authenticated = false;
	private token: string | null = null;
	private clientId = '';
	private proposalPending = false;

	constructor(private readonly runtime: CompanionBrowserRuntime = new CompanionBrowserRuntime()) {}

	/** Restore cached state, attach browser listeners, and connect to the app. */
	async start() {
		const stored = await this.runtime.readStorage();

		this.registry.restore(stored.darkModeLiteControllerState);
		this.token = typeof stored.darkModeLiteControllerToken === 'string' && stored.darkModeLiteControllerToken.length > 0 ? stored.darkModeLiteControllerToken : null;
		this.clientId = typeof stored.darkModeLiteControllerClientId === 'string' && stored.darkModeLiteControllerClientId.length > 0 ? stored.darkModeLiteControllerClientId : crypto.randomUUID();
		this.proposalPending = stored.darkModeLiteControllerProposalPending === true;

		await this.runtime.writeStorage({ [STORAGE_CLIENT_ID_KEY]: this.clientId });

		await this.pruneClosedTabs();

		this.attachBrowserListeners();
		this.connect();
	}

	private attachBrowserListeners() {
		chrome.runtime.onMessage.addListener((input, sender) => {
			if (this.isSettingsProposalMessage(input)) {
				void this.cacheSettingsProposal(Reflect.get(input, 'settings'));

				return false;
			}

			if (!this.isContentReadyMessage(input) || sender.tab?.id === undefined) {
				return false;
			}

			void this.applyToTab(sender.tab.id, sender.tab.url ?? '');

			return false;
		});

		chrome.tabs.onRemoved.addListener((tabId) => {
			if (!this.registry.isManaged(tabId)) {
				return;
			}

			this.registry.unmanage(tabId);
			void this.persistState().then(() => this.sendStateSnapshot(null));
		});

		chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
			if (change.status === 'loading' && this.registry.isManaged(tabId)) {
				void this.applyToTab(tabId, tab.url ?? '');
			}

			if (change.status === 'complete') {
				void this.sendTabsSnapshot();
			}
		});

		chrome.tabs.onActivated.addListener(() => void this.sendTabsSnapshot());
		chrome.windows.onFocusChanged.addListener(() => void this.sendTabsSnapshot());
		chrome.alarms.onAlarm.addListener((alarm) => {
			if (alarm.name === RECONNECT_ALARM_NAME) {
				this.connect();
			}
		});
	}

	private connect() {
		if (this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN) {
			return;
		}

		this.clearReconnect();
		this.authenticated = false;

		try {
			const socket = new WebSocket(CONTROLLER_BRIDGE_URL);

			this.socket = socket;
			socket.addEventListener('open', () => this.handleOpen());
			socket.addEventListener('message', (event) => this.handleSocketMessage(event.data));
			socket.addEventListener('close', () => this.handleClose());
			socket.addEventListener('error', () => socket.close());
		} catch {
			this.scheduleReconnect();
		}
	}

	private handleOpen() {
		this.runtime.clearReconnectAlarm();
		this.send({
			version: CONTROLLER_PROTOCOL_VERSION,
			type: 'hello',
			clientId: this.clientId,
			browserFamily: this.runtime.browserFamily(),
			browserVersion: this.runtime.browserVersion(),
			extensionVersion: this.runtime.extensionVersion(),
			token: this.token,
		});
		this.scheduleHeartbeat();
	}

	private handleSocketMessage(input: unknown) {
		if (typeof input !== 'string') {
			this.sendError(null, 'invalid-payload', 'The native app sent a non-text payload.');

			return;
		}

		const command = ControllerProtocolCodec.parseJSON(input);

		if (!command) {
			this.sendError(null, 'invalid-command', 'The native app sent an unsupported command.');

			return;
		}

		void this.handleCommand(command);
	}

	private async handleCommand(command: NativeControllerCommand) {
		if (command.type === 'hello.accepted') {
			this.authenticated = true;
			this.sendPendingProposal();

			await this.sendTabsSnapshot();

			this.sendStateSnapshot(null);

			return;
		}

		if (command.type === 'pairing.accepted') {
			this.token = command.token;
			this.authenticated = true;

			await this.runtime.writeStorage({ [STORAGE_TOKEN_KEY]: command.token });

			this.sendPendingProposal();

			await this.sendTabsSnapshot();

			this.sendStateSnapshot(null);

			return;
		}

		if (command.type === 'error') {
			return;
		}

		if (!this.authenticated) {
			this.sendError('requestId' in command ? command.requestId : null, 'pairing-required', 'Pair this browser before sending controller commands.');

			return;
		}

		if (command.type === 'settings.replace') {
			if (this.registry.replaceSettings(command.revision, command.settings)) {
				this.proposalPending = false;

				await this.persistState();

				await this.runtime.writeStorage({ [STORAGE_PROPOSAL_KEY]: false });

				await this.applyToManagedTabs();

				this.sendStateSnapshot(null);
			}

			return;
		}

		if (command.type === 'tab.manage') {
			await this.manageTab(command.requestId, command.tabId);

			return;
		}

		if (command.type === 'tab.unmanage') {
			await this.unmanageTab(command.requestId, command.tabId);

			return;
		}

		if (command.type === 'state.request') {
			this.sendStateSnapshot(command.requestId);

			return;
		}

		this.send({ version: 1, type: 'pong', sentAt: command.sentAt });
	}

	private async manageTab(requestId: string, tabId: number) {
		const tab = (await this.runtime.queryTabs()).find((entry) => entry.tabId === tabId);

		if (!tab?.injectable) {
			this.sendError(requestId, 'unsupported-tab', 'This browser tab does not allow page styling.');

			return;
		}

		this.registry.manage(tabId);

		await this.persistState();

		if (!(await this.applyToTab(tabId, tab.url))) {
			this.registry.unmanage(tabId);

			await this.persistState();

			this.sendError(requestId, 'content-unavailable', 'The page did not accept the dark-mode engine.');

			return;
		}

		this.sendStateSnapshot(requestId);
	}

	private async unmanageTab(requestId: string, tabId: number) {
		this.registry.unmanage(tabId);

		await this.persistState();

		await this.runtime.sendToTab(tabId, { source: CONTENT_MESSAGE_SOURCE, type: 'dispose' });

		this.sendStateSnapshot(requestId);
	}

	private async applyToManagedTabs() {
		const tabs = await this.runtime.queryTabs();

		await Promise.all(tabs.filter((tab) => this.registry.isManaged(tab.tabId)).map((tab) => this.applyToTab(tab.tabId, tab.url)));
	}

	private async applyToTab(tabId: number, url: string) {
		if (!this.registry.isManaged(tabId)) {
			return this.runtime.sendToTab(tabId, { source: CONTENT_MESSAGE_SOURCE, type: 'dispose' });
		}

		return this.runtime.sendToTab(tabId, {
			source: CONTENT_MESSAGE_SOURCE,
			type: 'apply',
			settings: this.registry.snapshot().settings,
			active: this.registry.shouldApply(tabId, url),
		});
	}

	private async pruneClosedTabs() {
		const openTabIds = await this.runtime.queryOpenTabIds();

		for (const tabId of this.registry.snapshot().managedTabIds) {
			if (!openTabIds.has(tabId)) {
				this.registry.unmanage(tabId);
			}
		}

		await this.persistState();
	}

	private async persistState() {
		await this.runtime.writeStorage({ [STORAGE_STATE_KEY]: this.registry.snapshot() });
	}

	private async cacheSettingsProposal(input: unknown) {
		const snapshot = this.registry.snapshot();

		this.registry.replaceSettings(snapshot.revision, input);
		this.proposalPending = true;

		await this.persistState();

		await this.runtime.writeStorage({ [STORAGE_PROPOSAL_KEY]: true });

		await this.applyToManagedTabs();

		this.sendPendingProposal();
	}

	private sendPendingProposal() {
		if (!this.authenticated || !this.proposalPending) {
			return;
		}

		const snapshot = this.registry.snapshot();

		this.send({
			version: 1,
			type: 'settings.proposal',
			clientId: this.clientId,
			baseRevision: snapshot.revision,
			settings: snapshot.settings,
		});
	}

	private async sendTabsSnapshot() {
		if (!this.authenticated) {
			return;
		}

		this.send({
			version: 1,
			type: 'tabs.snapshot',
			clientId: this.clientId,
			tabs: await this.runtime.queryTabs(),
		});
	}

	private sendStateSnapshot(requestId: string | null) {
		if (!this.authenticated) {
			return;
		}

		this.send({
			version: 1,
			type: 'state.snapshot',
			requestId,
			clientId: this.clientId,
			state: this.registry.snapshot(),
		});
	}

	private sendError(requestId: string | null, code: string, message: string) {
		this.send({ version: 1, type: 'error', requestId, code, message });
	}

	private send(event: ControllerExtensionEvent) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(event));
		}
	}

	private handleClose() {
		this.authenticated = false;
		this.socket = null;
		this.clearHeartbeat();
		this.scheduleReconnect();
	}

	private scheduleReconnect() {
		this.clearReconnect();
		this.reconnectTimer = self.setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
		this.runtime.scheduleReconnectAlarm();
	}

	private clearReconnect() {
		if (this.reconnectTimer) {
			self.clearTimeout(this.reconnectTimer);
			this.reconnectTimer = 0;
		}

		this.runtime.clearReconnectAlarm();
	}

	private scheduleHeartbeat() {
		this.clearHeartbeat();
		this.heartbeatTimer = self.setInterval(() => {
			this.send({ version: 1, type: 'heartbeat', sentAt: Date.now() });
		}, HEARTBEAT_DELAY_MS);
	}

	private clearHeartbeat() {
		if (this.heartbeatTimer) {
			self.clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = 0;
		}
	}

	private isContentReadyMessage(input: unknown) {
		if (typeof input !== 'object' || input === null || Array.isArray(input)) {
			return false;
		}

		// SAFETY: the object/array/null guard above establishes an object suitable
		// for string-keyed protocol lookup at this runtime boundary.
		const record = input as Record<string, unknown>;

		return record.source === CONTENT_MESSAGE_SOURCE && record.type === 'ready';
	}

	private isSettingsProposalMessage(input: unknown) {
		if (typeof input !== 'object' || input === null || Array.isArray(input)) {
			return false;
		}

		return Reflect.get(input, 'source') === CONTENT_MESSAGE_SOURCE && Reflect.get(input, 'type') === 'propose-settings';
	}
}
