<script setup lang="ts">
import { Ban, Check, ChevronRight, Globe } from '@lucide/vue';

const props = defineProps<{
	host: string;
	hostLabel: string;
	active: boolean;
	siteEnabled: boolean;
	blockedCount: number;
}>();

const emit = defineEmits<{
	'toggle-site': [];
	'open-blocklist': [];
}>();

const blocklistLabel = () => `${props.blockedCount} ${props.blockedCount === 1 ? 'site' : 'sites'} on your blocklist`;
</script>

<template>
	<section class="rounded-[14px] border border-border bg-card p-3">
		<div class="flex items-center gap-[11px]">
			<div class="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-border bg-[#1A212C] text-[#9BA6B4]">
				<Globe class="size-[17px]" :stroke-width="1.6" aria-hidden="true" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate font-mono text-[13px] font-medium text-foreground">{{ hostLabel }}</div>
				<div class="mt-[3px] text-[11px] text-muted-foreground">{{ active ? 'Dark mode active' : 'Paused here' }}</div>
			</div>
			<button
				type="button"
				class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				:style="
					siteEnabled
						? 'background:rgba(35,213,195,.12);border:1px solid rgba(35,213,195,.3);color:#2FE0CE'
						: 'background:var(--muted);border:1px solid var(--border);color:var(--muted-foreground)'
				"
				:disabled="!host"
				@click="emit('toggle-site')"
			>
				<component :is="siteEnabled ? Check : Ban" class="size-[13px]" :stroke-width="2.2" aria-hidden="true" />
				{{ siteEnabled ? 'On here' : 'Off here' }}
			</button>
		</div>

		<div class="my-[10px] h-px" style="background: rgba(255, 255, 255, 0.05)" />

		<button type="button" class="flex w-full cursor-pointer items-center gap-2 text-left" @click="emit('open-blocklist')">
			<Ban class="size-3.5 text-[#6C7686]" :stroke-width="1.7" aria-hidden="true" />
			<span class="flex-1 text-[11.5px] text-muted-foreground">{{ blocklistLabel() }}</span>
			<span class="flex items-center gap-0.5 text-[11.5px] font-medium text-[#2FE0CE]">
				Manage
				<ChevronRight class="size-3" :stroke-width="2" aria-hidden="true" />
			</span>
		</button>
	</section>
</template>
