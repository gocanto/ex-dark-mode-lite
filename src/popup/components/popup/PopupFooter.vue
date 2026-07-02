<script setup lang="ts">
import { ArrowUpRight, Heart, Sparkles } from '@lucide/vue';

defineProps<{
	status: string;
}>();
</script>

<template>
	<footer class="mt-1.5 border-t pt-3.5" style="border-color: rgba(255, 255, 255, 0.05)">
		<p v-if="status" class="mb-2 flex min-w-0 items-center justify-center gap-1 truncate text-[11px] text-muted-foreground" aria-live="polite">
			<Sparkles class="size-3" aria-hidden="true" />
			{{ status }}
		</p>
		<div class="flex items-center justify-center gap-[5px] text-[11px] text-[#6C7686]">
			<span>Crafted with</span>
			<Heart class="size-[11px] text-[#F2667B]" fill="currentColor" stroke="none" aria-hidden="true" />
			<span>by</span>
			<a class="flex items-center gap-[3px] font-semibold text-[#AEB7C4] transition-colors hover:text-foreground" href="https://gocanto.sh" target="_blank" rel="noreferrer">
				gocanto.sh
				<ArrowUpRight class="size-[11px]" :stroke-width="2" aria-hidden="true" />
			</a>
		</div>
	</footer>
</template>
