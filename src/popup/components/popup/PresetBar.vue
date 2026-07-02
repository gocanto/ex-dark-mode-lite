<script setup lang="ts">
import { Plus, X } from '@lucide/vue';
import type { ThemePreset } from '@/types/settings';

defineProps<{
	presets: ThemePreset[];
	activePresetId: string | null;
}>();

const emit = defineEmits<{
	'apply-preset': [id: string];
	'delete-preset': [id: string];
	'save-preset': [];
}>();
</script>

<template>
	<section>
		<div class="mb-[9px] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--label)]">Presets</div>
		<div class="flex flex-wrap gap-2">
			<div
				v-for="preset in presets"
				:key="preset.id"
				class="flex cursor-pointer items-center gap-[7px] rounded-full px-3 py-1.5 text-[12px] transition-colors"
				:style="
					activePresetId === preset.id
						? 'background:rgba(35,213,195,.12);border:1px solid rgba(35,213,195,.32);color:#2FE0CE;font-weight:600'
						: 'background:var(--card);border:1px solid rgba(255,255,255,.07);color:#AEB7C4;font-weight:500'
				"
				role="button"
				:aria-pressed="activePresetId === preset.id"
				@click="emit('apply-preset', preset.id)"
			>
				<span class="size-[7px] rounded-full" :style="{ background: preset.dot, boxShadow: activePresetId === preset.id ? `0 0 6px ${preset.dot}b3` : 'none' }" />
				{{ preset.name }}
				<button
					v-if="!preset.builtin"
					type="button"
					class="-mr-1 ml-0.5 flex cursor-pointer items-center rounded-full text-muted-foreground hover:text-foreground"
					:aria-label="`Delete ${preset.name} preset`"
					@click.stop="emit('delete-preset', preset.id)"
				>
					<X class="size-3" :stroke-width="2.2" aria-hidden="true" />
				</button>
			</div>

			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-[#B4BDC9]"
				style="border-color: rgba(255, 255, 255, 0.16)"
				@click="emit('save-preset')"
			>
				<Plus class="size-3" :stroke-width="2" aria-hidden="true" />
				Save
			</button>
		</div>
	</section>
</template>
