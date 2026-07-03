<script setup lang="ts">
import { Separator } from '@web/components/ui/separator';
import { AUTHOR_URL, PRIVACY_PATH, TERMS_PATH } from '@web/config/site';
</script>

<template>
	<footer class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5 px-10 py-11 max-640:px-5 max-640:py-9">
		<div class="flex items-center gap-[11px]">
			<img src="/logo-a.svg" width="30" height="30" class="block rounded-[9px]" alt="Dark Mode Lite" />
			<span class="text-[14.5px] font-semibold text-[#c4ccd6]">Dark Mode Lite</span>
		</div>
		<nav class="flex items-center gap-3.5 text-[13px] text-dim">
			<a :href="PRIVACY_PATH" class="font-medium hover:text-ink">Privacy</a>
			<Separator orientation="vertical" class="h-3.5 bg-white/12" />
			<a :href="TERMS_PATH" class="font-medium hover:text-ink">Terms</a>
		</nav>
		<div class="flex items-center gap-1.5 text-[13px] text-dim">
			<span>Crafted with</span>
			<span class="flex text-[#f2667b]">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
					<path
						d="M12 20.3l-1.4-1.3C5.4 14.3 2.6 11.7 2.6 8.6 2.6 6.1 4.5 4.2 7 4.2c1.4 0 2.8.7 3.7 1.8l1.3 1.5 1.3-1.5c.9-1.1 2.3-1.8 3.7-1.8 2.5 0 4.4 1.9 4.4 4.4 0 3.1-2.8 5.7-8 10.4L12 20.3Z"
					/>
				</svg>
			</span>
			<span>by</span>
			<a :href="AUTHOR_URL" target="_blank" rel="noopener" class="font-semibold text-[#aeb7c4] hover:text-ink">gocanto.sh</a>
		</div>
	</footer>
</template>
