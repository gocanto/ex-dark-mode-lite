<script setup lang="ts">
import MoonIcon from '@web/components/icons/MoonIcon.vue';

interface PopupMode {
	label: string;
	active: boolean;
}

/** Theme modes shown in the mock extension popup. */
const MODES: readonly PopupMode[] = [
	{ label: 'Smart', active: true },
	{ label: 'Invert', active: false },
	{ label: 'Soft', active: false },
];
</script>

<template>
	<div
		class="animate-dml-float absolute -bottom-10 -left-[34px] w-[214px] overflow-hidden rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,#0f141c,#0b0f16)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] max-640:-bottom-[34px] max-640:left-2.5"
	>
		<div class="flex items-center justify-between p-3">
			<div class="flex items-center gap-[9px]">
				<div class="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(35,213,195,0.32)] bg-[linear-gradient(150deg,#123430,#0e211f)] text-teal">
					<MoonIcon variant="stroked" width="15" height="15" />
				</div>
				<div class="text-xs leading-[1.2] font-semibold text-ink">Dark Mode<br />Lite</div>
			</div>
			<div class="relative h-[22px] w-[38px] rounded-full bg-[linear-gradient(180deg,#28e0cd,#18c1b0)] shadow-[0_0_0_1px_rgba(35,213,195,0.4),0_0_12px_rgba(35,213,195,0.3)]">
				<div class="absolute top-[3px] left-[19px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></div>
			</div>
		</div>
		<div class="flex gap-[5px] px-3 pb-3">
			<div
				v-for="mode in MODES"
				:key="mode.label"
				class="flex-1 rounded-lg py-[7px] text-center text-[11px]"
				:class="mode.active ? 'bg-[linear-gradient(180deg,#2a3542,#212a36)] font-semibold text-[#38e0ce]' : 'font-medium text-[#8a94a2]'"
			>
				{{ mode.label }}
			</div>
		</div>
	</div>
</template>
