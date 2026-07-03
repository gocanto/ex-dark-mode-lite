<script setup lang="ts">
import { Button } from '@dml/ui';
import { AUTHOR_URL, CHROME_STORE_URL } from '@web/config/site';

interface NavLink {
	href: string;
	label: string;
	external: boolean;
}

/** In-page and external navigation links (hidden on narrow screens). */
const NAV_LINKS: readonly NavLink[] = [
	{ href: '/#features', label: 'Features', external: false },
	{ href: '/#how', label: 'How it works', external: false },
	{ href: AUTHOR_URL, label: 'gocanto.sh', external: true },
];
</script>

<template>
	<nav class="mx-auto flex max-w-[1200px] items-center justify-between gap-5 border-b border-white/6 px-10 py-[18px] max-640:px-5 max-640:py-4">
		<a href="/" class="flex items-center gap-[11px]">
			<img src="/logo-a.svg" width="36" height="36" class="block rounded-[10px] shadow-[0_0_18px_rgba(35,213,195,0.22)]" alt="Dark Mode Lite" />
			<span class="text-base font-semibold tracking-[-0.01em]">Dark Mode Lite</span>
		</a>
		<div class="flex items-center gap-[30px] max-640:gap-[18px]">
			<a
				v-for="link in NAV_LINKS"
				:key="link.href"
				:href="link.href"
				:target="link.external ? '_blank' : undefined"
				:rel="link.external ? 'noopener' : undefined"
				class="text-[13.5px] font-medium tracking-[0.01em] text-[#9ba6b4] hover:text-ink max-640:hidden"
			>
				{{ link.label }}
			</a>
			<Button as="a" :href="CHROME_STORE_URL" target="_blank" rel="noopener" class="rounded-[10px] bg-ink px-[17px] py-[9px] text-[13.5px] font-bold text-night hover:bg-white">
				Add to Chrome
			</Button>
		</div>
	</nav>
</template>
