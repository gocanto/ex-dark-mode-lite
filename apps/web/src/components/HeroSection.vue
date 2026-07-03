<script setup lang="ts">
import BrowserDemo from '@web/components/BrowserDemo.vue';
import PopupCard from '@web/components/PopupCard.vue';
import ArrowRightIcon from '@web/components/icons/ArrowRightIcon.vue';
import { Button } from '@dml/ui';
import { CHROME_STORE_URL } from '@web/config/site';
</script>

<template>
	<header id="top" class="mx-auto max-w-[1200px] px-10 pt-[70px] pb-[30px] max-640:px-5 max-640:pt-14 max-640:pb-6">
		<div class="grid grid-cols-[minmax(320px,0.92fr)_minmax(360px,1.15fr)] items-center gap-12 max-920:grid-cols-1 max-920:gap-14">
			<div>
				<div class="animate-dml-up mb-[22px] font-mono text-xs tracking-[0.18em] uppercase text-teal [animation-delay:20ms]">Free Chrome extension</div>
				<h1 class="animate-dml-up m-0 text-[clamp(48px,6vw,82px)] leading-[0.96] font-bold tracking-[-0.035em] text-ink-bright [animation-delay:80ms]">
					Dark mode<br />for <span class="font-serif font-normal italic tracking-[-0.01em] text-teal">every site</span><span class="text-teal">.</span>
				</h1>
				<p class="animate-dml-up mt-[26px] mb-0 max-w-[430px] text-lg leading-[1.6] text-slate [animation-delay:160ms]">
					The web still ships blinding white. Dark Mode Lite rewrites each page as you land on it — matching contrast to content, not just flipping colors.
				</p>
				<div class="animate-dml-up mt-9 flex flex-wrap items-center gap-[18px] [animation-delay:240ms]">
					<Button
						as="a"
						:href="CHROME_STORE_URL"
						target="_blank"
						rel="noopener"
						class="h-auto gap-2.5 rounded-[13px] bg-[linear-gradient(180deg,#2fe6d3,#16bead)] px-6 py-[15px] text-[16.5px] font-bold text-[#042420] shadow-[0_14px_34px_-10px_rgba(35,213,195,0.55)] hover:bg-[linear-gradient(180deg,#2fe6d3,#16bead)] hover:brightness-[1.06]"
					>
						Add to Chrome — Free
						<ArrowRightIcon width="18" height="18" />
					</Button>
					<span class="text-[13.5px] text-dim">No account · No tracking</span>
				</div>
			</div>

			<div class="animate-dml-up relative [animation-duration:0.7s] [animation-delay:300ms] max-920:mb-10">
				<BrowserDemo />
				<PopupCard />
			</div>
		</div>
	</header>
</template>
