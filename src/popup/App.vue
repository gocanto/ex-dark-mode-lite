<script setup lang="ts">
import { Ban, Check, MonitorCog, Moon, RotateCcw, Sparkles } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/popup/components/ui/button';
import { Slider } from '@/popup/components/ui/slider';
import { Switch } from '@/popup/components/ui/switch';
import { cn } from '@/lib/utils';

import { DEFAULT_SETTINGS, type ExtensionState, type PopupMessage, type Settings, type ThemeMode, migrateSettings, normalizeHost } from '@/types/settings';

const modes: Array<{ value: ThemeMode; label: string }> = [
	{ value: 'smart', label: 'Smart' },
	{ value: 'invert', label: 'Invert' },
	{ value: 'soft', label: 'Soft' },
];

const activeTabId = ref<number | null>(null);

const activeTabUrl = ref('');

const currentState = ref<ExtensionState>(buildState(DEFAULT_SETTINGS));

const status = ref('');

const statusTimer = ref<number | null>(null);

const settings = computed(() => currentState.value.settings);

const isExtensionRuntime = computed(() => typeof chrome !== 'undefined' && Boolean(chrome.tabs && chrome.storage && chrome.scripting));

const hostLabel = computed(() => currentState.value.host || 'Preview mode');

const siteActionLabel = computed(() => (currentState.value.siteEnabled ? 'Disable here' : 'Enable here'));

function setStatus(text: string) {
	status.value = text;
	if (statusTimer.value) {
		window.clearTimeout(statusTimer.value);
	}

	statusTimer.value = window.setTimeout(() => {
		status.value = '';
	}, 1500);
}

function getActiveHost() {
	if (!activeTabUrl.value) {
		return '';
	}

	try {
		const url = new URL(activeTabUrl.value);

		return normalizeHost(url.hostname || '');
	} catch {
		return '';
	}
}

function canInjectIntoTab() {
	if (!activeTabUrl.value) {
		return false;
	}

	try {
		const url = new URL(activeTabUrl.value);

		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function buildState(nextSettings: Settings): ExtensionState {
	const host = getActiveHost();
	const siteEnabled = nextSettings.siteOverrides?.[host] ?? true;

	return {
		settings: nextSettings,
		host,
		active: Boolean(nextSettings.enabled && siteEnabled),
		siteEnabled,
	};
}

function sendToTab(message: PopupMessage) {
	return new Promise<ExtensionState>((resolve, reject) => {
		if (!activeTabId.value) {
			reject(new Error('No active tab'));

			return;
		}

		chrome.tabs.sendMessage(activeTabId.value, message, (response: ExtensionState) => {
			const error = chrome.runtime.lastError;

			if (error) {
				reject(new Error(error.message));

				return;
			}

			resolve(response);
		});
	});
}

async function injectContentScript() {
	if (!activeTabId.value) {
		throw new Error('No active tab');
	}

	await chrome.scripting.executeScript({
		target: { tabId: activeTabId.value, allFrames: true },
		files: ['src/content.js'],
	});
}

async function readSettings() {
	if (!isExtensionRuntime.value) {
		return DEFAULT_SETTINGS;
	}

	const settings = await chrome.storage.sync.get(null);

	return migrateSettings(settings as Partial<Settings>);
}

async function writeSettings(nextSettings: Settings) {
	if (!isExtensionRuntime.value) {
		return;
	}

	await chrome.storage.sync.set(nextSettings);
}

async function applySettingsToActiveTab(nextSettings: Settings) {
	if (!isExtensionRuntime.value || !canInjectIntoTab()) {
		await writeSettings(nextSettings);

		return buildState(nextSettings);
	}

	try {
		return await sendToTab({
			source: 'personal-dark-mode-lite',
			type: 'set-settings',
			patch: nextSettings,
		});
	} catch {
		try {
			await injectContentScript();

			return await sendToTab({
				source: 'personal-dark-mode-lite',
				type: 'set-settings',
				patch: nextSettings,
			});
		} catch {
			await writeSettings(nextSettings);

			return buildState(nextSettings);
		}
	}
}

async function getStateFromTab() {
	try {
		return await sendToTab({ source: 'personal-dark-mode-lite', type: 'get-state' });
	} catch (error) {
		if (!canInjectIntoTab()) {
			throw error;
		}

		await injectContentScript();

		return sendToTab({ source: 'personal-dark-mode-lite', type: 'get-state' });
	}
}

async function getState() {
	if (isExtensionRuntime.value && canInjectIntoTab()) {
		return getStateFromTab();
	}

	return buildState(await readSettings());
}

async function patchSettings(patch: Partial<Settings>, message = 'Saved') {
	const existing = currentState.value.settings || (await readSettings());

	const nextSettings = migrateSettings({
		...existing,
		...patch,
		siteOverrides: {
			...existing.siteOverrides,
			...(patch.siteOverrides || {}),
		},
	});

	currentState.value = await applySettingsToActiveTab(nextSettings);

	setStatus(message);
}

async function replaceSettings(nextSettings: Settings, message = 'Saved') {
	const normalizedSettings = migrateSettings(nextSettings);

	currentState.value = await applySettingsToActiveTab(normalizedSettings);

	setStatus(message);
}

async function selectMode(mode: ThemeMode) {
	const host = currentState.value.host || getActiveHost();
	const siteOverrides = { ...currentState.value.settings.siteOverrides };

	if (host) {
		siteOverrides[host] = true;
	}

	await patchSettings({ mode, siteOverrides }, 'Saved');
}

async function toggleSite() {
	const host = currentState.value.host || getActiveHost();

	if (!host) {
		setStatus('Open a website tab');

		return;
	}

	const siteEnabled = currentState.value.settings.siteOverrides?.[host] ?? true;

	await patchSettings(
		{
			siteOverrides: {
				...currentState.value.settings.siteOverrides,
				[host]: !siteEnabled,
			},
		},
		siteEnabled ? 'Disabled here' : 'Enabled here',
	);
}

async function resetSettings() {
	await replaceSettings(DEFAULT_SETTINGS, 'Reset');
}

function showError(error: unknown) {
	console.error(error);
	setStatus(error instanceof Error ? error.message : 'Unavailable');
}

async function init() {
	if (!isExtensionRuntime.value) {
		currentState.value = buildState(DEFAULT_SETTINGS);

		return;
	}

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	activeTabId.value = tab?.id || null;
	activeTabUrl.value = tab?.url || '';

	try {
		currentState.value = await getState();
	} catch (error) {
		currentState.value = buildState(await readSettings());

		showError(error);
	}
}

onMounted(() => {
	init().catch(showError);
});
</script>

<template>
	<main class="mx-auto grid w-80 gap-4 bg-background p-4 text-foreground">
		<header class="flex items-center justify-between gap-3">
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<Moon class="size-4 text-sky-300" aria-hidden="true" />
					<h1 class="truncate text-base font-semibold">Dark Mode Lite</h1>
				</div>
				<p class="mt-1 truncate text-xs text-muted-foreground">{{ hostLabel }}</p>
			</div>
			<Switch :checked="settings.enabled" label="Enable extension globally" @update:checked="patchSettings({ enabled: $event }).catch(showError)" />
		</header>

		<section class="grid gap-3 rounded-md border border-border bg-card p-3">
			<div class="flex items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2">
					<MonitorCog class="size-4 text-emerald-300" aria-hidden="true" />
					<span class="truncate text-sm font-medium">Site</span>
				</div>
				<Button variant="outline" size="sm" :disabled="!currentState.host" @click="toggleSite().catch(showError)">
					<component :is="currentState.siteEnabled ? Ban : Check" />
					{{ siteActionLabel }}
				</Button>
			</div>

			<div class="grid grid-cols-3 overflow-hidden rounded-md border border-border" role="group" aria-label="Mode">
				<Button
					v-for="mode in modes"
					:key="mode.value"
					:class="cn('h-8 rounded-none border-0 text-xs', settings.mode === mode.value && 'bg-primary text-primary-foreground hover:bg-primary/90')"
					:variant="settings.mode === mode.value ? 'default' : 'ghost'"
					@click="selectMode(mode.value).catch(showError)"
				>
					{{ mode.label }}
				</Button>
			</div>
		</section>

		<section class="grid gap-3 rounded-md border border-border bg-card p-3">
			<label class="grid gap-2">
				<span class="flex justify-between text-sm font-medium">
					Brightness
					<output class="text-muted-foreground">{{ settings.brightness }}%</output>
				</span>
				<Slider
					:model-value="settings.brightness"
					:min="50"
					:max="150"
					label="Brightness"
					@update:model-value="currentState.settings.brightness = $event"
					@commit="patchSettings({ brightness: $event }).catch(showError)"
				/>
			</label>

			<label class="grid gap-2">
				<span class="flex justify-between text-sm font-medium">
					Contrast
					<output class="text-muted-foreground">{{ settings.contrast }}%</output>
				</span>
				<Slider
					:model-value="settings.contrast"
					:min="50"
					:max="150"
					label="Contrast"
					@update:model-value="currentState.settings.contrast = $event"
					@commit="patchSettings({ contrast: $event }).catch(showError)"
				/>
			</label>

			<label class="grid gap-2">
				<span class="flex justify-between text-sm font-medium">
					Sepia
					<output class="text-muted-foreground">{{ settings.sepia }}%</output>
				</span>
				<Slider
					:model-value="settings.sepia"
					:min="0"
					:max="100"
					label="Sepia"
					@update:model-value="currentState.settings.sepia = $event"
					@commit="patchSettings({ sepia: $event }).catch(showError)"
				/>
			</label>
		</section>

		<footer class="flex min-h-8 items-center justify-between gap-3 border-t border-border pt-3">
			<Button variant="ghost" size="sm" title="Reset settings" @click="resetSettings().catch(showError)">
				<RotateCcw />
				Reset
			</Button>
			<span class="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground" aria-live="polite">
				<Sparkles v-if="status" class="size-3" aria-hidden="true" />
				{{ status }}
			</span>
		</footer>

		<p class="text-center text-xs text-muted-foreground">
			Made with love ❤️ by
			<a class="font-medium text-foreground underline-offset-4 hover:underline" href="https://gocanto.sh" target="_blank"> gocanto.sh </a>
		</p>
	</main>
</template>
