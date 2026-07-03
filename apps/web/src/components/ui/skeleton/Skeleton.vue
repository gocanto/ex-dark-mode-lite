<script setup lang="ts">
import { type HTMLAttributes } from 'vue';
import { cn } from '@dml/ui/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<div :class="cn('animate-pulse rounded-md bg-white/[0.06]', props.class)" />
</template>
