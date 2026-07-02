<script setup lang="ts">
import { ArrowLeft, Ban, Check, Globe } from '@lucide/vue';

defineProps<{
	blockedSites: string[];
}>();

const emit = defineEmits<{
	back: [];
	'unblock-site': [host: string];
}>();
</script>

<template>
	<section class="grid gap-4">
		<header class="flex items-center gap-2">
			<button
				type="button"
				class="flex size-8 cursor-pointer items-center justify-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
				aria-label="Back"
				@click="emit('back')"
			>
				<ArrowLeft class="size-4" :stroke-width="1.8" aria-hidden="true" />
			</button>
			<h1 class="text-base font-semibold">Blocklist</h1>
		</header>

		<div v-if="blockedSites.length === 0" class="flex flex-col items-center gap-2 rounded-[14px] border border-border bg-card px-4 py-8 text-center">
			<Ban class="size-6 text-muted-foreground" :stroke-width="1.5" aria-hidden="true" />
			<p class="text-[12px] text-muted-foreground">No blocked sites yet.<br />Turn a site off to add it here.</p>
		</div>

		<ul v-else class="grid gap-2">
			<li v-for="host in blockedSites" :key="host" class="flex items-center gap-[11px] rounded-[14px] border border-border bg-card p-3">
				<div class="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-border bg-[#1A212C] text-[#9BA6B4]">
					<Globe class="size-[17px]" :stroke-width="1.6" aria-hidden="true" />
				</div>
				<span class="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-foreground">{{ host }}</span>
				<button
					type="button"
					class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold text-[#2FE0CE] transition-colors"
					style="background: rgba(35, 213, 195, 0.12); border: 1px solid rgba(35, 213, 195, 0.3)"
					@click="emit('unblock-site', host)"
				>
					<Check class="size-[13px]" :stroke-width="2.2" aria-hidden="true" />
					Enable
				</button>
			</li>
		</ul>
	</section>
</template>
