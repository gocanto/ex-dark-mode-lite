<script setup lang="ts">
import { Card } from '@web/components/ui/card';

interface Step {
	num: string;
	title: string;
	body: string;
}

/** The three onboarding steps. */
const STEPS: readonly Step[] = [
	{ num: '1', title: 'Install', body: 'Add it to Chrome for free. No sign-up, no permissions circus.' },
	{ num: '2', title: 'Toggle on', body: 'Click the icon and flip the switch. The whole page goes dark instantly.' },
	{ num: '3', title: 'Fine-tune', body: 'Nudge brightness or pick a preset. It remembers your choice per site.' },
];
</script>

<template>
	<section id="how" class="mx-auto max-w-[1200px] px-10 pt-[70px] pb-10 max-640:px-5 max-640:pt-14 max-640:pb-8">
		<div class="mb-[34px] font-mono text-xs tracking-[0.16em] uppercase text-teal">Three taps to a darker web</div>
		<div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
			<Card v-for="step in STEPS" :key="step.num" class="rounded-[10px] border-white/6 bg-white/[0.015] px-[30px] py-8">
				<div class="font-serif text-[40px] leading-none text-teal">{{ step.num }}</div>
				<h3 class="mt-4 mb-[7px] text-[17px] font-semibold text-ink">{{ step.title }}</h3>
				<p class="m-0 text-sm leading-[1.6] text-mist">{{ step.body }}</p>
			</Card>
		</div>
	</section>
</template>
