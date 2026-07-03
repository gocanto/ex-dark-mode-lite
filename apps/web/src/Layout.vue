<script setup lang="ts">
import { useData, useRouter } from 'vitepress';
import { computed, ref } from 'vue';
import AnnouncementBar from '@web/components/AnnouncementBar.vue';
import BackToTop from '@web/components/BackToTop.vue';
import PageSkeleton from '@web/components/PageSkeleton.vue';
import PageAtmosphere from '@web/components/PageAtmosphere.vue';
import SiteFooter from '@web/components/SiteFooter.vue';
import SiteNav from '@web/components/SiteNav.vue';
import HomeView from '@web/views/HomeView.vue';
import PrivacyView from '@web/views/PrivacyView.vue';
import TermsView from '@web/views/TermsView.vue';

/** Views keyed by the `page` frontmatter field; anything unset renders the landing page. */
const VIEWS = { privacy: PrivacyView, terms: TermsView } as const;

const { frontmatter } = useData();

const page = computed(() => frontmatter.value.page as keyof typeof VIEWS | undefined);

const isHome = computed(() => !page.value || !(page.value in VIEWS));

const view = computed(() => (isHome.value ? HomeView : VIEWS[page.value as keyof typeof VIEWS]));

// Show a skeleton while a client-side navigation resolves the next page, so the
// content area keeps its height and the footer doesn't jump between routes.
const router = useRouter();

const isNavigating = ref(false);

router.onBeforeRouteChange = () => {
	isNavigating.value = true;
};

router.onAfterRouteChanged = () => {
	isNavigating.value = false;
};
</script>

<template>
	<div class="relative min-h-screen w-full overflow-x-hidden bg-night font-sans text-ink">
		<PageAtmosphere />
		<div class="relative z-[1]">
			<AnnouncementBar v-if="isHome" />
			<SiteNav />
			<div class="min-h-[70vh]">
				<PageSkeleton v-if="isNavigating" />
				<Transition v-else name="dml-fade" mode="out-in">
					<component :is="view" :key="page || 'home'" />
				</Transition>
			</div>
			<SiteFooter />
		</div>
		<BackToTop />
	</div>
</template>
