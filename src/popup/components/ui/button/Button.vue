<script setup lang="ts">
import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLAttributes, computed } from 'vue';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				outline: 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
				ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
			},
			size: {
				default: 'h-9 px-3',
				sm: 'h-8 px-2.5 text-xs',
				icon: 'size-9 p-0',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

const props = defineProps<{
	class?: HTMLAttributes['class'];
	variant?: ButtonVariants['variant'];
	size?: ButtonVariants['size'];
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
	title?: string;
}>();

const classes = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), props.class));
</script>

<template>
	<button :class="classes" :type="type || 'button'" :disabled="disabled" :title="title">
		<slot />
	</button>
</template>
