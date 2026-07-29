import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer as createHTTPServer, type Server as HTTPServer } from 'node:http';
import { createServer as createTCPServer, type Server as TCPServer, type Socket } from 'node:net';
import { join, resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

const controllerPort = 59_387;
const controllerSource = 'dark-mode-lite-controller';
const scratchRoot = '/Users/gocanto/.codex/work/codex';

interface WireMessage {
	readonly version: number;
	readonly type: string;
	readonly [key: string]: unknown;
}

interface Waiter {
	readonly predicate: (message: WireMessage) => boolean;
	readonly resolve: (message: WireMessage) => void;
	readonly reject: (error: Error) => void;
	readonly timer: NodeJS.Timeout;
}

class NativeBridgeHarness {
	private server: TCPServer | null = null;
	private socket: Socket | null = null;
	private upgraded = false;
	private buffer = Buffer.alloc(0);
	private readonly pending: WireMessage[] = [];
	private readonly waiters: Waiter[] = [];

	async start() {
		this.server = createTCPServer((socket) => this.accept(socket));

		await new Promise<void>((resolveStart, rejectStart) => {
			this.server?.once('error', rejectStart);
			this.server?.listen(controllerPort, '127.0.0.1', () => resolveStart());
		});
	}

	async stop() {
		this.socket?.destroy();
		this.socket = null;

		for (const waiter of this.waiters.splice(0)) {
			clearTimeout(waiter.timer);
			waiter.reject(new Error('Native bridge stopped.'));
		}

		await new Promise<void>((resolveStop) => {
			if (!this.server) {
				resolveStop();

				return;
			}

			this.server.close(() => resolveStop());
		});

		this.server = null;
	}

	send(message: WireMessage) {
		if (!this.socket || !this.upgraded) {
			throw new Error('WebSocket client is not connected.');
		}

		this.socket.write(NativeBridgeHarness.encodeTextFrame(JSON.stringify(message)));
	}

	waitFor(type: string, predicate: (message: WireMessage) => boolean = () => true) {
		const matches = (message: WireMessage) => message.type === type && predicate(message);
		const pendingIndex = this.pending.findIndex(matches);

		if (pendingIndex >= 0) {
			return Promise.resolve(this.pending.splice(pendingIndex, 1)[0]!);
		}

		return new Promise<WireMessage>((resolveMessage, rejectMessage) => {
			const timer = setTimeout(() => {
				const index = this.waiters.findIndex((waiter) => waiter.timer === timer);

				if (index >= 0) {
					this.waiters.splice(index, 1);
				}

				rejectMessage(new Error(`Timed out waiting for ${type}.`));
			}, 10_000);

			this.waiters.push({
				predicate: matches,
				resolve: resolveMessage,
				reject: rejectMessage,
				timer,
			});
		});
	}

	private accept(socket: Socket) {
		this.socket?.destroy();
		this.socket = socket;
		this.upgraded = false;
		this.buffer = Buffer.alloc(0);
		socket.on('data', (chunk) => this.receive(chunk));
		socket.on('error', () => void 0);
	}

	private receive(chunk: Buffer) {
		this.buffer = Buffer.concat([this.buffer, chunk]);

		if (!this.upgraded) {
			const headerEnd = this.buffer.indexOf('\r\n\r\n');

			if (headerEnd < 0) {
				return;
			}

			const headers = this.buffer.subarray(0, headerEnd).toString('utf8');
			const key = headers.match(/^Sec-WebSocket-Key:\s*(.+)$/im)?.[1]?.trim();

			if (!key || !this.socket) {
				this.socket?.destroy();

				return;
			}

			const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');

			this.socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
			this.upgraded = true;
			this.buffer = this.buffer.subarray(headerEnd + 4);
		}

		this.readFrames();
	}

	private readFrames() {
		while (this.buffer.length >= 2) {
			const firstByte = this.buffer[0]!;
			const secondByte = this.buffer[1]!;
			const opcode = firstByte & 0x0f;
			const masked = (secondByte & 0x80) !== 0;

			let payloadLength = secondByte & 0x7f;
			let offset = 2;

			if (payloadLength === 126) {
				if (this.buffer.length < 4) {
					return;
				}

				payloadLength = this.buffer.readUInt16BE(2);
				offset = 4;
			} else if (payloadLength === 127) {
				if (this.buffer.length < 10) {
					return;
				}

				const longLength = this.buffer.readBigUInt64BE(2);

				if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) {
					this.socket?.destroy();

					return;
				}

				payloadLength = Number(longLength);
				offset = 10;
			}

			const maskLength = masked ? 4 : 0;
			const frameLength = offset + maskLength + payloadLength;

			if (this.buffer.length < frameLength) {
				return;
			}

			const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
			const payloadStart = offset + maskLength;
			const payload = Buffer.from(this.buffer.subarray(payloadStart, frameLength));

			this.buffer = this.buffer.subarray(frameLength);

			if (mask) {
				for (let index = 0; index < payload.length; index += 1) {
					payload[index] = payload[index]! ^ mask[index % 4]!;
				}
			}

			if (opcode === 0x8) {
				this.socket?.end();

				return;
			}

			if (opcode === 0x9) {
				this.socket?.write(NativeBridgeHarness.encodeFrame(payload, 0x0a));
				continue;
			}

			if (opcode !== 0x1) {
				continue;
			}

			try {
				const parsed = JSON.parse(payload.toString('utf8')) as unknown;

				if (NativeBridgeHarness.isWireMessage(parsed)) {
					this.emit(parsed);
				}
			} catch {
				// The extension protocol is expected to emit JSON text only.
			}
		}
	}

	private emit(message: WireMessage) {
		const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));

		if (waiterIndex < 0) {
			this.pending.push(message);

			return;
		}

		const waiter = this.waiters.splice(waiterIndex, 1)[0]!;

		clearTimeout(waiter.timer);
		waiter.resolve(message);
	}

	private static encodeTextFrame(text: string) {
		return NativeBridgeHarness.encodeFrame(Buffer.from(text, 'utf8'), 0x01);
	}

	private static encodeFrame(payload: Buffer, opcode: number) {
		let header: Buffer;

		if (payload.length < 126) {
			header = Buffer.from([0x80 | opcode, payload.length]);
		} else if (payload.length <= 0xffff) {
			header = Buffer.alloc(4);
			header[0] = 0x80 | opcode;
			header[1] = 126;
			header.writeUInt16BE(payload.length, 2);
		} else {
			header = Buffer.alloc(10);
			header[0] = 0x80 | opcode;
			header[1] = 127;
			header.writeBigUInt64BE(BigInt(payload.length), 2);
		}

		return Buffer.concat([header, payload]);
	}

	private static isWireMessage(input: unknown): input is WireMessage {
		return typeof input === 'object' && input !== null && !Array.isArray(input) && typeof Reflect.get(input, 'type') === 'string';
	}
}

class FixtureServer {
	private server: HTTPServer | null = null;
	private port = 0;

	async start() {
		this.server = createHTTPServer((request, response) => {
			response.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'no-store',
			});
			response.end(this.document(request.url ?? '/'));
		});

		await new Promise<void>((resolveStart, rejectStart) => {
			this.server?.once('error', rejectStart);
			this.server?.listen(0, '127.0.0.1', () => {
				const address = this.server?.address();

				if (!address || typeof address === 'string') {
					rejectStart(new Error('Fixture server did not expose a TCP port.'));

					return;
				}

				this.port = address.port;
				resolveStart();
			});
		});
	}

	url(path: string) {
		return `http://127.0.0.1:${this.port}${path}`;
	}

	async stop() {
		await new Promise<void>((resolveStop) => {
			if (!this.server) {
				resolveStop();

				return;
			}

			this.server.close(() => resolveStop());
		});

		this.server = null;
	}

	private document(path: string) {
		return `<!doctype html>
<html>
  <head><title>Fixture ${path}</title></head>
  <body style="background-color: rgb(255, 255, 255); color: rgb(17, 17, 17)">
    <main>
      <article id="fixture-card" style="background-color: rgb(255, 255, 255); color: rgb(17, 17, 17); border-top: 1px solid rgb(230, 230, 230)">
        <h1>Dark Mode Lite ${path}</h1>
        <a href="/two">Navigation target</a>
        <img id="fixture-media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='red'/%3E%3C/svg%3E">
      </article>
    </main>
  </body>
</html>`;
	}
}

const defaults = {
	enabled: true,
	mode: 'smart',
	brightness: 100,
	contrast: 92,
	sepia: 0,
	settingsVersion: 3,
	siteOverrides: {},
	customPresets: [],
	activePresetId: 'default',
};

test('native companion preserves managed-tab dark mode across its complete lifecycle', async ({}, testInfo) => {
	const bridge = new NativeBridgeHarness();
	const fixture = new FixtureServer();
	const artifactRoot = process.env.PLAYWRIGHT_ARTIFACTS_DIR ?? '/Users/gocanto/.codex/cache/codex/browser-artifacts';
	const extensionPath = resolve('release/controller/chromium');

	let context: BrowserContext | null = null;
	let page: Page | null = null;
	let profilePath = '';
	let failed = false;

	await mkdir(scratchRoot, { recursive: true });

	await mkdir(artifactRoot, { recursive: true });

	await bridge.start();

	await fixture.start();

	try {
		profilePath = await mkdtemp(join(scratchRoot, 'dark-mode-lite-playwright-'));

		context = await chromium.launchPersistentContext(profilePath, {
			channel: 'chromium',
			headless: true,
			args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
		});

		await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

		page = context.pages()[0] ?? (await context.newPage());

		const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));

		expect(context.pages()).toHaveLength(1);

		const hello = await bridge.waitFor('hello');

		expect(hello.browserFamily).toBe('chromium');
		expect(hello.token).toBeNull();

		bridge.send({
			version: 1,
			type: 'pairing.accepted',
			token: Buffer.alloc(32, 7).toString('base64'),
		});
		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 0,
			settings: defaults,
		});

		await page.goto(fixture.url('/one'));

		const tabsSnapshot = await bridge.waitFor('tabs.snapshot', (message) => {
			const tabs = Array.isArray(message.tabs) ? message.tabs : [];

			return tabs.some((tab) => typeof tab === 'object' && tab !== null && Reflect.get(tab, 'url') === fixture.url('/one'));
		});

		const managedTab = (tabsSnapshot.tabs as Array<Record<string, unknown>>).find((tab) => tab.url === fixture.url('/one'));
		const tabId = managedTab?.tabId;

		expect(typeof tabId).toBe('number');

		bridge.send({
			version: 1,
			type: 'tab.manage',
			requestId: 'manage-one',
			tabId,
		});

		await bridge.waitFor('state.snapshot', (message) => message.requestId === 'manage-one');

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-active', 'true');

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-mode', 'smart');

		await page.evaluate(() => {
			const dynamic = document.createElement('div');

			dynamic.id = 'dynamic-card';
			dynamic.style.backgroundColor = 'rgb(255, 255, 255)';
			dynamic.style.color = 'rgb(8, 8, 8)';
			dynamic.textContent = 'Dynamic content';
			document.body.appendChild(dynamic);
		});

		await expect.poll(() => page?.locator('#dynamic-card').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(23, 27, 34)');

		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 1,
			settings: {
				...defaults,
				mode: 'invert',
				activePresetId: null,
			},
		});

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-mode', 'invert');

		await expect.poll(() => page?.locator('html').evaluate((element) => getComputedStyle(element).filter)).toContain('invert(1)');

		await expect.poll(() => page?.locator('#fixture-media').evaluate((element) => getComputedStyle(element).filter)).toContain('invert(1)');

		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 2,
			settings: {
				...defaults,
				mode: 'soft',
				brightness: 96,
				contrast: 88,
				sepia: 18,
				activePresetId: 'reading',
			},
		});

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-mode', 'soft');

		await expect.poll(() => page?.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(17, 19, 24)');

		await expect(page.locator('#dark-mode-lite-style')).toContainText('brightness(96%) contrast(88%) sepia(18%)');

		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 3,
			settings: {
				...defaults,
				brightness: 78,
				contrast: 100,
				activePresetId: 'night-owl',
			},
		});

		await page.reload();

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-active', 'true');

		await expect(page.locator('#dark-mode-lite-style')).toContainText('brightness(78%) contrast(100%)');

		await bridge.stop();

		const offlineSettings = {
			...defaults,
			mode: 'soft',
			brightness: 90,
			contrast: 86,
			sepia: 12,
			activePresetId: null,
		};

		await serviceWorker.evaluate(
			async ({ messageSource, settings }) => {
				const extensionAPI = (
					globalThis as typeof globalThis & {
						chrome: {
							runtime: {
								sendMessage: (message: unknown, callback: () => void) => void;
							};
						};
					}
				).chrome;

				await new Promise<void>((resolveMessage) => {
					extensionAPI.runtime.sendMessage(
						{
							source: messageSource,
							type: 'propose-settings',
							settings,
						},
						resolveMessage,
					);
				});
			},
			{ messageSource: controllerSource, settings: offlineSettings },
		);

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-mode', 'soft');

		await page.reload();

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-mode', 'soft');

		await expect(page.locator('#dark-mode-lite-style')).toContainText('brightness(90%) contrast(86%) sepia(12%)');

		await bridge.start();

		const reconnectHello = await bridge.waitFor('hello', (message) => typeof message.token === 'string');

		expect(reconnectHello.clientId).toBe(hello.clientId);
		bridge.send({
			version: 1,
			type: 'hello.accepted',
		});

		const proposal = await bridge.waitFor('settings.proposal');

		expect(proposal.baseRevision).toBe(3);
		expect(proposal.settings).toEqual(offlineSettings);
		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 4,
			settings: offlineSettings,
		});

		await page.goto(fixture.url('/two'));

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-active', 'true');

		await expect(page.locator('h1')).toContainText('/two');

		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 5,
			settings: {
				...defaults,
				siteOverrides: { '127.0.0.1': false },
				activePresetId: null,
			},
		});

		await expect(page.locator('html')).not.toHaveAttribute('data-dm-lite-active', 'true');

		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 6,
			settings: {
				...defaults,
				enabled: false,
				activePresetId: null,
			},
		});

		await expect(page.locator('html')).not.toHaveAttribute('data-dm-lite-active', 'true');

		bridge.send({
			version: 1,
			type: 'settings.replace',
			revision: 7,
			settings: defaults,
		});

		await expect(page.locator('html')).toHaveAttribute('data-dm-lite-active', 'true');

		bridge.send({
			version: 1,
			type: 'tab.unmanage',
			requestId: 'unmanage-one',
			tabId,
		});

		await bridge.waitFor('state.snapshot', (message) => message.requestId === 'unmanage-one');

		await expect(page.locator('html')).not.toHaveAttribute('data-dm-lite-active', 'true');

		await expect(page.locator('#dark-mode-lite-style')).toHaveCount(0);

		await expect
			.poll(() =>
				page?.locator('#fixture-card').evaluate((element) => ({
					background: (element as HTMLElement).style.backgroundColor,
					color: (element as HTMLElement).style.color,
					borderPriority: (element as HTMLElement).style.getPropertyPriority('border-top-color'),
				})),
			)
			.toEqual({
				background: 'rgb(255, 255, 255)',
				color: 'rgb(17, 17, 17)',
				borderPriority: '',
			});
	} catch (error) {
		failed = true;

		if (page) {
			await page.screenshot({
				path: testInfo.outputPath('controller-extension-failure.png'),
				fullPage: true,
			});
		}

		throw error;
	} finally {
		if (context) {
			if (failed) {
				await context.tracing.stop({ path: testInfo.outputPath('controller-extension-trace.zip') });
			} else {
				await context.tracing.stop();
			}

			await context.close();
		}

		await fixture.stop();

		await bridge.stop();

		if (profilePath) {
			await rm(profilePath, { recursive: true, force: true });
		}
	}
});
