<script setup lang="ts">
import { Separator, type SeparatorProps } from 'reka-ui';
import { type HTMLAttributes } from 'vue';
import { cn } from '@dml/ui/utils';

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>(), { orientation: 'horizontal', decorative: true });
</script>

<template>
	<Separator :orientation="orientation" :decorative="decorative" :class="cn('shrink-0 bg-border', orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full', props.class)" />
</template>
