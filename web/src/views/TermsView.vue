<script setup lang="ts">
import { BadgeCheck, Ban, RefreshCw, ShieldAlert } from '@lucide/vue';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Separator } from '@web/components/ui/separator';
import LegalPage from '@web/views/LegalPage.vue';

interface Term {
	icon: typeof BadgeCheck;
	title: string;
	body: string;
}

const TERMS: readonly Term[] = [
	{
		icon: BadgeCheck,
		title: 'Free to use',
		body: 'Dark Mode Lite is free and provided at no cost for personal and commercial browsing. No account, subscription, or payment is ever required.',
	},
	{
		icon: ShieldAlert,
		title: 'Provided "as is"',
		body: 'The extension is provided without warranties of any kind. It restyles pages on a best-effort basis and may not render every site perfectly. To the fullest extent permitted by law, the author is not liable for any damages arising from its use.',
	},
	{
		icon: Ban,
		title: 'Acceptable use',
		body: 'Use the extension only for lawful purposes and in line with the browser and websites you visit. Do not attempt to repackage, resell, or misrepresent it as your own product.',
	},
	{
		icon: RefreshCw,
		title: 'Changes to these terms',
		body: 'These terms may be updated as the extension evolves. The current version is always the one published at this URL, and continued use of the extension means you accept it.',
	},
];
</script>

<template>
	<LegalPage eyebrow="Terms" title="Terms of Use" updated="July 2026">
		<p class="text-lg leading-[1.6] text-slate">
			By installing and using Dark Mode Lite, you agree to these terms. They're deliberately short — it's a free, private extension with no accounts and no data collection.
		</p>

		<Card v-for="term in TERMS" :key="term.title">
			<CardHeader class="flex-row items-center gap-3">
				<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
					<component :is="term.icon" :size="18" />
				</span>
				<CardTitle class="text-ink">{{ term.title }}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="m-0 text-[15px] leading-[1.65] text-mist">{{ term.body }}</p>
			</CardContent>
		</Card>

		<Separator class="my-2 bg-white/8" />

		<p class="text-[15px] leading-[1.65] text-mist">
			Privacy is covered separately in our
			<a href="/privacy" class="font-medium text-teal hover:text-ink-bright">Privacy Policy</a>.
		</p>
	</LegalPage>
</template>
