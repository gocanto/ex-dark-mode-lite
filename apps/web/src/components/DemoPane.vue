<script setup lang="ts">
/** Colorway of one browser-demo article pane. */
type PaneVariant = 'light' | 'dark';

type PaneVars = Record<'--bg' | '--tx' | '--mut' | '--line' | '--img' | '--tag', string>;

const props = defineProps<{ variant: PaneVariant }>();

const PANE_VARS: Record<PaneVariant, PaneVars> = {
	light: {
		'--bg': '#f6f7f9',
		'--tx': '#141821',
		'--mut': '#6b7482',
		'--line': '#e5e8ec',
		'--img': 'linear-gradient(135deg, #e8ecf1, #d6dce4)',
		'--tag': '#0d8c7e',
	},
	dark: {
		'--bg': '#0d1117',
		'--tx': '#e7ecf3',
		'--mut': '#8b95a4',
		'--line': '#232b37',
		'--img': 'linear-gradient(135deg, #153a34, #0e2622)',
		'--tag': '#2fe0ce',
	},
};
</script>

<template>
	<div class="absolute inset-0 bg-(--bg) px-8 pt-[54px] pb-[30px] max-640:px-5 max-640:pt-12 max-640:pb-6" :style="PANE_VARS[props.variant]">
		<div class="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-(--tag)">Technology</div>
		<div class="mt-3 text-2xl leading-[1.15] font-bold tracking-[-0.02em] text-(--tx)">The quiet case for calmer screens</div>
		<div class="mt-3.5 flex items-center gap-[9px]">
			<span class="h-[22px] w-[22px] rounded-full bg-(--line)"></span>
			<span class="text-[12.5px] text-(--mut)">By A. Canto · 6 min read</span>
		</div>
		<div class="my-[18px] h-[118px] rounded-xl bg-[image:var(--img)]"></div>
		<p class="m-0 text-[13.5px] leading-[1.7] text-(--tx)" :class="props.variant === 'dark' ? 'opacity-[0.92]' : 'opacity-90'">
			For anyone reading after dark, glare is the difference between finishing an article and closing the tab. Most sites never offer a way out.
		</p>
		<p class="m-0 mt-3 text-[13.5px] leading-[1.7] text-(--mut) opacity-100">So we built one that works on all of them.</p>
	</div>
</template>
