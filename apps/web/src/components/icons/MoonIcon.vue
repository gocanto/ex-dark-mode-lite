<script setup lang="ts">
/** Moon glyph used across the page: 'filled' is a solid moon, 'stroked' an outlined one. */
withDefaults(defineProps<{ variant?: 'filled' | 'stroked' }>(), { variant: 'filled' });
</script>

<template>
	<svg v-if="variant === 'filled'" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
		<path d="M20.5 13.2A8.2 8.2 0 1 1 10.8 3.5a6.4 6.4 0 0 0 9.7 9.7Z" />
	</svg>
	<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M20.5 13.2A8.2 8.2 0 1 1 10.8 3.5a6.4 6.4 0 0 0 9.7 9.7Z" />
	</svg>
</template>
