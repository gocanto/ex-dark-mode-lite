<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
	checked?: boolean;
	class?: HTMLAttributes['class'];
	disabled?: boolean;
	label?: string;
}>();

const emit = defineEmits<{
	'update:checked': [checked: boolean];
}>();

const classes = computed(() =>
	cn(
		'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
		props.checked && 'bg-primary',
		props.class,
	),
);
</script>

<template>
	<button :class="classes" type="button" role="switch" :aria-checked="checked" :aria-label="label" :disabled="disabled" @click="emit('update:checked', !checked)">
		<span :class="cn('pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')" />
	</button>
</template>
