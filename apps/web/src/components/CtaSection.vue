<script setup lang="ts">
import ArrowRightIcon from '@web/components/icons/ArrowRightIcon.vue';
import { Button } from '@dml/ui';
import { CHROME_STORE_URL } from '@web/config/site';
</script>

<template>
	<section class="relative mt-20 overflow-hidden bg-[#f4f6f8] text-[#0e1116]">
		<div class="mx-auto flex max-w-[1200px] flex-col items-center px-10 py-[88px] text-center max-640:px-5 max-640:py-16">
			<div class="mb-5 flex items-center gap-[9px] font-mono text-[11.5px] tracking-[0.16em] uppercase text-[#8a93a0]">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E0A83A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
				</svg>
				This is what your eyes have been putting up with
			</div>
			<h2 class="m-0 max-w-[760px] text-[clamp(38px,5vw,64px)] leading-none font-bold tracking-[-0.03em] text-[#0e1116]">
				Turn the whole web <span class="font-serif font-normal italic text-[#0d9e8e]">easy on the eyes.</span>
			</h2>
			<p class="mt-5 mb-0 max-w-[420px] text-[17px] leading-[1.55] text-[#55606e]">Free, private, and it works on every site you visit.</p>
			<div class="mt-8 flex flex-wrap items-center justify-center gap-4">
				<Button
					as="a"
					:href="CHROME_STORE_URL"
					target="_blank"
					rel="noopener"
					class="h-auto gap-2.5 rounded-[13px] bg-[#0e1116] px-[26px] py-4 text-[16.5px] font-bold text-[#f4f6f8] shadow-[0_16px_34px_-12px_rgba(14,17,22,0.5)] hover:bg-black"
				>
					Add to Chrome — Free
					<ArrowRightIcon width="18" height="18" />
				</Button>
				<span class="text-[13.5px] text-[#8a93a0]">No account needed</span>
			</div>
		</div>
	</section>
</template>
