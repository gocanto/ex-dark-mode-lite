<script setup lang="ts">
import { Badge } from '@web/components/ui/badge';
</script>

<template>
	<div class="flex items-center justify-center px-4 py-[9px]">
		<Badge variant="outline" class="gap-[9px] border-white/8 bg-transparent px-3 py-1 text-[12.5px] font-normal tracking-[0.01em] text-mist">
			<span class="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(47,224,206,0.8)]" />
			<span>Smart per-page tuning &amp; saved presets are here</span>
		</Badge>
	</div>
</template>
