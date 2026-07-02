<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';
import { Contrast, Sparkles, Sun } from '@lucide/vue';
import { cn } from '@lib/utils';
import type { ThemeMode } from '@/types/settings';

const props = defineProps<{
	selectedMode: ThemeMode;
}>();

const emit = defineEmits<{
	'select-mode': [mode: ThemeMode];
}>();

const modes: Array<{ value: ThemeMode; label: string; icon: Component; hint: string }> = [
	{ value: 'smart', label: 'Smart', icon: Sparkles, hint: 'Smart tunes contrast per page for the most natural-looking dark theme.' },
	{ value: 'invert', label: 'Invert', icon: Contrast, hint: 'Invert flips every color — best for simple, text-heavy pages.' },
	{ value: 'soft', label: 'Soft', icon: Sun, hint: 'Soft applies a gentle dark palette without analyzing the page.' },
];

const activeHint = computed(() => modes.find((mode) => mode.value === props.selectedMode)?.hint ?? '');
</script>

<template>
	<section>
		<div class="mb-[9px] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--label)]">Mode</div>
		<div class="flex gap-1 rounded-xl border border-border bg-card p-1" role="group" aria-label="Mode">
			<button
				v-for="mode in modes"
				:key="mode.value"
				type="button"
				:aria-pressed="selectedMode === mode.value"
				:class="
					cn(
						'flex h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] text-[12.5px] transition-colors',
						selectedMode === mode.value ? 'mode-active font-semibold text-[#38E0CE]' : 'font-medium text-[#8A94A2] hover:bg-white/[0.035]',
					)
				"
				@click="emit('select-mode', mode.value)"
			>
				<component :is="mode.icon" class="size-[15px]" :stroke-width="1.7" aria-hidden="true" />
				{{ mode.label }}
			</button>
		</div>
		<p class="mt-[9px] text-[11px] leading-[1.45] text-[#727C8B]">{{ activeHint }}</p>
	</section>
</template>

<style scoped>
.mode-active {
	background: linear-gradient(180deg, #2a3542, #212a36);
	box-shadow:
		0 1px 2px rgba(0, 0, 0, 0.35),
		inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
</style>
