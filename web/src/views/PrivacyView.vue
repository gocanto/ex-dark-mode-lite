<script setup lang="ts">
import { EyeOff, HardDriveDownload, ShieldOff } from '@lucide/vue';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Separator } from '@web/components/ui/separator';
import LegalPage from '@web/views/LegalPage.vue';

interface Point {
	icon: typeof ShieldOff;
	title: string;
	body: string;
}

/** Mirrors the canonical policy in PRIVACY.md. */
const POINTS: readonly Point[] = [
	{
		icon: ShieldOff,
		title: 'No data collection',
		body: 'The extension has no analytics, no accounts, and makes no network requests to us or to any third party.',
	},
	{
		icon: HardDriveDownload,
		title: 'Local settings only',
		body: "Your preferences — theme mode, brightness/contrast/sepia, custom presets, and per-site on/off choices — are saved with Chrome's storage.sync API. They stay in your browser profile and, if you're signed in to Chrome, are synced by Google across your devices. We never see them.",
	},
	{
		icon: EyeOff,
		title: 'No page data access',
		body: 'The content script only applies styling to the pages you visit. It does not read, record, or transmit page content, form input, or browsing history.',
	},
];
</script>

<template>
	<LegalPage eyebrow="Privacy" title="Privacy Policy" updated="July 2026">
		<p class="text-lg leading-[1.6] text-slate">Dark Mode Lite does not collect, store, transmit, or sell any user data.</p>

		<Card v-for="point in POINTS" :key="point.title">
			<CardHeader class="flex-row items-center gap-3">
				<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
					<component :is="point.icon" :size="18" />
				</span>
				<CardTitle class="text-ink">{{ point.title }}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="m-0 text-[15px] leading-[1.65] text-mist">{{ point.body }}</p>
			</CardContent>
		</Card>

		<Separator class="my-2 bg-white/8" />

		<p class="text-[15px] leading-[1.65] text-mist">If this policy ever changes, the update will be published at this URL and reflected in the extension's Chrome Web Store listing.</p>
	</LegalPage>
</template>
