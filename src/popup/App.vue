<script setup lang="ts">
import { ref } from 'vue';
import BlocklistManager from '@popup/components/popup/BlocklistManager.vue';
import ModeSelector from '@popup/components/popup/ModeSelector.vue';
import PopupFooter from '@popup/components/popup/PopupFooter.vue';
import PopupHeader from '@popup/components/popup/PopupHeader.vue';
import PresetBar from '@popup/components/popup/PresetBar.vue';
import SiteCard from '@popup/components/popup/SiteCard.vue';
import ThemeAdjustments from '@popup/components/popup/ThemeAdjustments.vue';
import { usePopupController } from '@composables/usePopupController';
import type { ThemeMode } from '@/types/settings';

type ThemeAdjustmentKey = 'brightness' | 'contrast' | 'sepia';

type PopupView = 'main' | 'blocklist';

const {
	activePresetId,
	applyPreset,
	blockedCount,
	blockedSites,
	commitAdjustment,
	currentState,
	deletePreset,
	hostLabel,
	patchSettings,
	presets,
	resetAdjustment,
	resetAdjustments,
	savePreset,
	selectMode,
	settings,
	showError,
	statusText,
	status,
	toggleSite,
	unblockSite,
} = usePopupController();

const view = ref<PopupView>('main');

function saveEnabled(enabled: boolean) {
	patchSettings({ enabled }).catch(showError);
}

function saveMode(mode: ThemeMode) {
	selectMode(mode).catch(showError);
}

function previewAdjustment(key: ThemeAdjustmentKey, value: number) {
	currentState.value.settings[key] = value;
}

function saveAdjustment(key: ThemeAdjustmentKey, value: number) {
	commitAdjustment(key, value).catch(showError);
}

function saveSiteToggle() {
	toggleSite().catch(showError);
}

function openBlocklist() {
	view.value = 'blocklist';
}

function closeBlocklist() {
	view.value = 'main';
}

function saveUnblock(host: string) {
	unblockSite(host).catch(showError);
}

function applyPresetById(id: string) {
	applyPreset(id).catch(showError);
}

function saveNewPreset() {
	savePreset().catch(showError);
}

function removePreset(id: string) {
	deletePreset(id).catch(showError);
}

function resetOne(key: ThemeAdjustmentKey) {
	resetAdjustment(key).catch(showError);
}

function resetAll() {
	resetAdjustments().catch(showError);
}
</script>

<template>
	<main class="mx-auto grid w-[360px] gap-4 p-4 text-foreground">
		<BlocklistManager v-if="view === 'blocklist'" :blocked-sites="blockedSites" @back="closeBlocklist" @unblock-site="saveUnblock" />

		<template v-else>
			<PopupHeader :enabled="settings.enabled" :status-text="statusText" @update:enabled="saveEnabled" />
			<SiteCard
				:host="currentState.host"
				:host-label="hostLabel"
				:active="currentState.active"
				:site-enabled="currentState.siteEnabled"
				:blocked-count="blockedCount"
				@toggle-site="saveSiteToggle"
				@open-blocklist="openBlocklist"
			/>
			<ModeSelector :selected-mode="settings.mode" @select-mode="saveMode" />
			<ThemeAdjustments :settings="settings" @preview="previewAdjustment" @commit="saveAdjustment" @reset-adjustment="resetOne" @reset-adjustments="resetAll" />
			<PresetBar :presets="presets" :active-preset-id="activePresetId" @apply-preset="applyPresetById" @delete-preset="removePreset" @save-preset="saveNewPreset" />
			<PopupFooter :status="status" />
		</template>
	</main>
</template>
