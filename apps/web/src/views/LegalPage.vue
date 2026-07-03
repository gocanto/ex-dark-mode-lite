<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import { Badge } from '@web/components/ui/badge';
import { Button } from '@dml/ui';

defineProps<{
	eyebrow: string;
	title: string;
	updated: string;
}>();
</script>

<template>
	<article class="mx-auto max-w-[760px] px-10 pt-[70px] pb-24 max-640:px-5 max-640:pt-12 max-640:pb-16">
		<div class="mb-8">
			<Button as="a" href="/" variant="ghost" size="sm" class="animate-dml-up -ml-2 h-8 gap-1.5 px-2 text-mist [animation-delay:20ms] hover:text-ink">
				<ArrowLeft :size="15" />
				Back to home
			</Button>
		</div>

		<div class="mb-5">
			<Badge variant="outline" class="animate-dml-up border-white/10 font-mono tracking-[0.16em] text-teal uppercase [animation-delay:60ms]">
				<span class="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(47,224,206,0.8)]" />
				{{ eyebrow }}
			</Badge>
		</div>

		<h1 class="animate-dml-up m-0 text-[clamp(38px,5vw,60px)] leading-[1.02] font-bold tracking-[-0.03em] text-ink-bright [animation-delay:120ms]">
			{{ title }}
		</h1>
		<p class="animate-dml-up mt-4 mb-0 font-mono text-[12.5px] tracking-[0.04em] text-dim [animation-delay:180ms]">Last updated {{ updated }}</p>

		<div class="animate-dml-up mt-12 flex flex-col gap-4 [animation-delay:240ms]">
			<slot />
		</div>
	</article>
</template>
