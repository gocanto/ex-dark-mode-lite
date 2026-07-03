<script setup lang="ts">
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
				<svg class="size-[18px]" viewBox="0 0 512 512" fill="none" aria-hidden="true">
					<defs>
						<clipPath id="dmlDiscRight"><rect x="256" y="80" width="200" height="352" /></clipPath>
					</defs>
					<circle cx="256" cy="256" r="134" fill="currentColor" clip-path="url(#dmlDiscRight)" />
					<circle cx="256" cy="256" r="134" fill="none" stroke="currentColor" stroke-width="20" />
					<path d="M372 118 L380.5 141 L403 149.5 L380.5 158 L372 181 L363.5 158 L341 149.5 L363.5 141 Z" fill="currentColor" />
				</svg>
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
