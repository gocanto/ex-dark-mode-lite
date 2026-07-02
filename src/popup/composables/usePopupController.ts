import { onMounted, onUnmounted } from 'vue';
import { PopupController } from '@composables/PopupController';
import { TimedStatus } from '@composables/TimedStatus';

/** Create and bind the popup controller to the Vue component lifecycle. */
export function usePopupController() {
	const statusController = new TimedStatus();
	const popupController = new PopupController(statusController);

	onMounted(() => {
		popupController.init().catch((error: unknown) => {
			popupController.showError(error);
		});
	});

	onUnmounted(() => {
		statusController.dispose();
	});

	return {
		activePresetId: popupController.activePresetId,
		applyPreset: popupController.applyPreset.bind(popupController),
		blockedCount: popupController.blockedCount,
		blockedSites: popupController.blockedSites,
		commitAdjustment: popupController.commitAdjustment.bind(popupController),
		currentState: popupController.currentState,
		deletePreset: popupController.deletePreset.bind(popupController),
		hostLabel: popupController.hostLabel,
		patchSettings: popupController.patchSettings.bind(popupController),
		presets: popupController.presets,
		resetAdjustment: popupController.resetAdjustment.bind(popupController),
		resetAdjustments: popupController.resetAdjustments.bind(popupController),
		resetSettings: popupController.resetSettings.bind(popupController),
		savePreset: popupController.savePreset.bind(popupController),
		selectMode: popupController.selectMode.bind(popupController),
		settings: popupController.settings,
		showError: popupController.showError.bind(popupController),
		siteActionLabel: popupController.siteActionLabel,
		statusText: popupController.statusText,
		status: statusController.status,
		toggleSite: popupController.toggleSite.bind(popupController),
		unblockSite: popupController.unblockSite.bind(popupController),
	};
}
