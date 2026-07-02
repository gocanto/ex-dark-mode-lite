<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { cn } from '@lib/utils';

const props = withDefaults(
	defineProps<{
		modelValue: number;
		class?: HTMLAttributes['class'];
		min?: number;
		max?: number;
		step?: number;
		label?: string;
	}>(),
	{
		min: 0,
		max: 100,
		step: 1,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: number];
	commit: [value: number];
}>();

const percent = computed(() => {
	const range = props.max - props.min;

	if (range <= 0) {
		return 0;
	}

	return ((props.modelValue - props.min) / range) * 100;
});

function readRangeInputValue(event: Event) {
	if (event.target instanceof HTMLInputElement) {
		return Number(event.target.value);
	}

	return props.modelValue;
}
</script>

<template>
	<div :class="cn('relative flex w-full touch-none select-none items-center', props.class)">
		<div class="absolute left-0 right-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full" style="background: var(--track)">
			<div class="h-full rounded-full" :style="{ width: `${percent}%`, background: 'linear-gradient(90deg, var(--fill-from), var(--fill-to))' }" />
		</div>
		<input
			class="theme-slider relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent"
			type="range"
			:aria-label="label"
			:min="min"
			:max="max"
			:step="step"
			:value="modelValue"
			@input="emit('update:modelValue', readRangeInputValue($event))"
			@change="emit('commit', readRangeInputValue($event))"
		/>
	</div>
</template>
