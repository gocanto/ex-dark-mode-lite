<script setup lang="ts">
import { ArrowUp } from '@lucide/vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { Button } from '@dml/ui';
import { cn } from '@dml/ui/utils';

/** Show the button only once the user has scrolled past this many pixels. */
const SCROLL_THRESHOLD = 480;

const visible = ref(false);

function onScroll(): void {
	visible.value = window.scrollY > SCROLL_THRESHOLD;
}

function scrollToTop(): void {
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

onMounted(() => {
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
	window.removeEventListener('scroll', onScroll);
});
</script>

<template>
	<Button
		size="icon"
		variant="outline"
		aria-label="Back to top"
		title="Back to top"
		:class="
			cn(
				'fixed right-6 bottom-6 z-50 size-11 rounded-full border-white/10 bg-card/85 text-ink shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)] backdrop-blur transition-all duration-300 hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none max-640:right-4 max-640:bottom-4',
				visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
			)
		"
		@click="scrollToTop"
	>
		<ArrowUp :size="18" />
	</Button>
</template>
