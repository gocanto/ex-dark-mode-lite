<script setup lang="ts">
import { Skeleton } from '@web/components/ui/skeleton';
</script>

<template>
	<!-- Placeholder shown during route navigation so the content area keeps its
	     height and the footer doesn't jump while the next page resolves. -->
	<div class="mx-auto max-w-[760px] px-10 pt-[70px] pb-24 max-640:px-5 max-640:pt-12 max-640:pb-16" aria-hidden="true">
		<Skeleton class="mb-8 h-4 w-28" />
		<Skeleton class="mb-5 h-6 w-24 rounded-full" />
		<Skeleton class="mb-4 h-14 w-[70%]" />
		<Skeleton class="mb-12 h-4 w-40" />
		<div class="flex flex-col gap-4">
			<Skeleton class="h-28 w-full rounded-xl" />
			<Skeleton class="h-28 w-full rounded-xl" />
			<Skeleton class="h-28 w-full rounded-xl" />
		</div>
	</div>
</template>
