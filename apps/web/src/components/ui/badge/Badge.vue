<script setup lang="ts">
import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLAttributes } from 'vue';
import { cn } from '@dml/ui/utils';

const badgeVariants = cva(
	'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				outline: 'border-border text-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

const props = defineProps<{
	class?: HTMLAttributes['class'];
	variant?: BadgeVariants['variant'];
}>();
</script>

<template>
	<div :class="cn(badgeVariants({ variant }), props.class)">
		<slot />
	</div>
</template>
