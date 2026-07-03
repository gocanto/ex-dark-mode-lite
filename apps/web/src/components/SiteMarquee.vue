<script setup lang="ts">
/** Reasons people reach for dark mode, scrolled through the marquee band. */
const SITES: readonly string[] = ['less eye strain', 'easier at night', 'saves battery', 'reduced glare', 'better focus', 'sleep friendly', 'kinder on the eyes', 'less blue light'];
</script>

<template>
	<section class="relative mt-[74px] overflow-hidden border-y border-white/6 py-5">
		<div class="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[120px] bg-[linear-gradient(90deg,#06080b,transparent)]"></div>
		<div class="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[120px] bg-[linear-gradient(270deg,#06080b,transparent)]"></div>
		<div class="animate-dml-marquee flex w-max">
			<div v-for="duplicate in [false, true]" :key="String(duplicate)" :aria-hidden="duplicate || undefined" class="flex items-center gap-10 pr-10 font-mono text-[15px] text-dim">
				<template v-for="site in SITES" :key="site">
					<span>{{ site }}</span>
					<span class="text-teal">·</span>
				</template>
			</div>
		</div>
	</section>
</template>
