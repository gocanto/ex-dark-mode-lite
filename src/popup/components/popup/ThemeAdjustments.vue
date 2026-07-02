<script setup lang="ts">
import type { Component } from 'vue';
import { Contrast, Droplet, RotateCcw, Sun } from '@lucide/vue';
import { Slider } from '@components/ui/slider';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Settings } from '@/types/settings';

type ThemeAdjustmentKey = 'brightness' | 'contrast' | 'sepia';

interface ThemeAdjustment {
	key: ThemeAdjustmentKey;
	label: string;
	icon: Component;
	max: number;
	min: number;
}

defineProps<{
	settings: Pick<Settings, ThemeAdjustmentKey>;
}>();

const emit = defineEmits<{
	commit: [key: ThemeAdjustmentKey, value: number];
	preview: [key: ThemeAdjustmentKey, value: number];
	'reset-adjustment': [key: ThemeAdjustmentKey];
	'reset-adjustments': [];
}>();

const adjustments: ThemeAdjustment[] = [
	{ key: 'brightness', label: 'Brightness', icon: Sun, min: 50, max: 150 },
	{ key: 'contrast', label: 'Contrast', icon: Contrast, min: 50, max: 150 },
	{ key: 'sepia', label: 'Sepia', icon: Droplet, min: 0, max: 100 },
];

function isDefault(key: ThemeAdjustmentKey, value: number) {
	return value === DEFAULT_SETTINGS[key];
}
</script>

<template>
	<section>
		<div class="mb-[13px] flex items-center justify-between">
			<div class="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--label)]">Adjustments</div>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-[#B4BDC9]"
				@click="emit('reset-adjustments')"
			>
				<RotateCcw class="size-3" :stroke-width="1.8" aria-hidden="true" />
				Reset
			</button>
		</div>

		<div class="flex flex-col gap-[15px]">
			<div v-for="adjustment in adjustments" :key="adjustment.key">
				<div class="mb-2 flex items-center">
					<component :is="adjustment.icon" class="mr-2 size-[15px] text-muted-foreground" :stroke-width="1.6" aria-hidden="true" />
					<span class="flex-1 text-[12.5px] font-medium text-[#DDE3EB]">{{ adjustment.label }}</span>
					<output class="rounded-md border border-border bg-muted px-[7px] py-0.5 font-mono text-[12px] text-[#C4CCD6]">{{ settings[adjustment.key] }}%</output>
					<button
						type="button"
						class="ml-[7px] flex cursor-pointer items-center transition-colors disabled:cursor-default"
						:class="isDefault(adjustment.key, settings[adjustment.key]) ? 'text-[#3B4352]' : 'text-[#2FD8C6]'"
						:disabled="isDefault(adjustment.key, settings[adjustment.key])"
						:aria-label="`Reset ${adjustment.label}`"
						@click="emit('reset-adjustment', adjustment.key)"
					>
						<RotateCcw class="size-[13px]" :stroke-width="1.8" aria-hidden="true" />
					</button>
				</div>
				<Slider
					:model-value="settings[adjustment.key]"
					:min="adjustment.min"
					:max="adjustment.max"
					:label="adjustment.label"
					@update:model-value="emit('preview', adjustment.key, $event)"
					@commit="emit('commit', adjustment.key, $event)"
				/>
			</div>
		</div>
	</section>
</template>
