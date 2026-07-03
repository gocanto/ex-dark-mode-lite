<script setup lang="ts">
interface Feature {
	num: string;
	title: string;
	body: string;
}

/** The four differentiating features. */
const FEATURES: readonly Feature[] = [
	{
		num: '01',
		title: 'Smart mode',
		body: 'Reads each page and tunes contrast and brightness for the most natural dark theme — automatically, no fiddling.',
	},
	{
		num: '02',
		title: 'Saved presets',
		body: 'Reading, Night Owl, or your own. Dial brightness, contrast and sepia once, then reuse the look anywhere.',
	},
	{
		num: '03',
		title: 'Per-site control',
		body: "Love a site's own dark theme? Switch Dark Mode Lite off for it with one tap — and it stays that way.",
	},
	{
		num: '04',
		title: 'Instant, no reload',
		body: 'Every change lands the moment you make it. No refresh, no flash of white, no waiting.',
	},
];
</script>

<template>
	<section
		id="features"
		class="mx-auto grid max-w-[1200px] grid-cols-[minmax(240px,0.7fr)_minmax(360px,1.3fr)] items-start gap-14 px-10 pt-24 pb-10 max-920:grid-cols-1 max-920:gap-10 max-640:px-5 max-640:pt-[72px] max-640:pb-8"
	>
		<div class="sticky top-10 max-920:static">
			<div class="mb-[18px] font-mono text-xs tracking-[0.16em] uppercase text-teal">What you get</div>
			<h2 class="m-0 text-[clamp(32px,3.4vw,46px)] leading-[1.04] font-bold tracking-[-0.025em] text-ink-bright">
				Dark that<br />actually looks<br /><span class="font-serif font-normal italic text-slate">good.</span>
			</h2>
			<p class="mt-[22px] mb-0 max-w-[290px] text-base leading-[1.6] text-mist">Not a blunt color invert. Four things that make the difference.</p>
		</div>

		<div>
			<div v-for="feature in FEATURES" :key="feature.num" class="grid grid-cols-[auto_1fr] items-start gap-6 border-t border-white/8 py-[26px] last:border-b">
				<div class="pt-1 font-mono text-sm text-teal">{{ feature.num }}</div>
				<div>
					<h3 class="mt-0 mb-2 text-xl font-semibold text-ink">{{ feature.title }}</h3>
					<p class="m-0 text-[15px] leading-[1.6] text-mist">{{ feature.body }}</p>
				</div>
			</div>
		</div>
	</section>
</template>
