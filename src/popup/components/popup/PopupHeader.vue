<script setup lang="ts">
import { Moon } from '@lucide/vue';
import { Switch } from '@components/ui/switch';

defineProps<{
	enabled: boolean;
	statusText: string;
}>();

const emit = defineEmits<{
	'update:enabled': [enabled: boolean];
}>();
</script>

<template>
	<header class="flex items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-[11px]">
			<div
				class="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] text-[#2FE0CE]"
				style="
					background: linear-gradient(150deg, #123430, #0e211f);
					border: 1px solid rgba(35, 213, 195, 0.32);
					box-shadow:
						0 0 14px rgba(35, 213, 195, 0.22),
						inset 0 1px 0 rgba(255, 255, 255, 0.06);
				"
			>
				<Moon class="size-[18px]" :stroke-width="1.7" aria-hidden="true" />
			</div>
			<div class="min-w-0">
				<h1 class="truncate text-[14.5px] font-semibold tracking-tight">Dark Mode Lite</h1>
				<div class="mt-1 flex items-center gap-1.5">
					<span class="size-1.5 rounded-full transition-colors" :style="enabled ? 'background:#2FE0CE;box-shadow:0 0 6px rgba(47,224,206,.85)' : 'background:#5E6879'" />
					<span class="text-[11px] text-muted-foreground">{{ statusText }}</span>
				</div>
			</div>
		</div>
		<Switch :checked="enabled" label="Enable extension globally" @update:checked="emit('update:enabled', $event)" />
	</header>
</template>
