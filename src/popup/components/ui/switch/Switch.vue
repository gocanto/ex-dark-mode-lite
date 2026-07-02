<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { cn } from '@lib/utils';

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
		'relative inline-flex h-[27px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
		props.checked && 'switch-on border-transparent',
		props.class,
	),
);
</script>

<template>
	<button :class="classes" type="button" role="switch" :aria-checked="checked" :aria-label="label" :disabled="disabled" @click="emit('update:checked', !checked)">
		<span :class="cn('pointer-events-none block size-[21px] rounded-full bg-white shadow-md ring-0 transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-[3px]')" />
	</button>
</template>

<style scoped>
.switch-on {
	background: linear-gradient(180deg, #28e0cd, #18c1b0);
	box-shadow:
		inset 0 1px 2px rgba(0, 0, 0, 0.25),
		0 0 0 1px rgba(35, 213, 195, 0.4),
		0 0 14px rgba(35, 213, 195, 0.3);
}
</style>
