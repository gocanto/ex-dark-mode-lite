<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { cn } from '@/lib/utils';

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
</script>

<template>
	<div :class="cn('relative flex w-full touch-none select-none items-center', props.class)">
		<div class="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-secondary">
			<div class="h-full rounded-full bg-primary" :style="{ width: `${percent}%` }" />
		</div>
		<input
			class="theme-slider relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent"
			type="range"
			:aria-label="label"
			:min="min"
			:max="max"
			:step="step"
			:value="modelValue"
			@input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
			@change="emit('commit', Number(($event.target as HTMLInputElement).value))"
		/>
	</div>
</template>
