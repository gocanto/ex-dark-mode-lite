<script setup lang="ts">
import DemoPane from '@web/components/DemoPane.vue';
import MoonIcon from '@web/components/icons/MoonIcon.vue';
</script>

<template>
	<div class="overflow-hidden rounded-2xl border border-[#06080b] bg-[#0d1117] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.8),0_0_70px_-20px_rgba(35,213,195,0.18)]">
		<!-- browser bar -->
		<div class="flex h-10 items-center gap-2 border-b border-white/6 bg-[#12171f] px-3.5">
			<span class="h-[11px] w-[11px] rounded-full bg-[#41474f]"></span>
			<span class="h-[11px] w-[11px] rounded-full bg-[#41474f]"></span>
			<span class="h-[11px] w-[11px] rounded-full bg-[#41474f]"></span>
			<div class="flex flex-1 justify-center">
				<div class="flex h-6 items-center gap-[7px] rounded-full border border-white/6 bg-[#0b0f16] px-3.5 font-mono text-[11.5px] text-mist">
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2FE0CE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M7 11V8a5 5 0 0 1 10 0v3" />
						<rect x="5" y="11" width="14" height="9" rx="2" />
					</svg>
					minimal-blog.com
				</div>
			</div>
			<div class="w-11"></div>
		</div>

		<!-- split content: light pane full, dark pane clipped to the right half -->
		<div class="relative h-[432px] overflow-hidden">
			<DemoPane variant="light" />
			<DemoPane variant="dark" class="[clip-path:inset(0_0_0_50%)]" />

			<div
				class="absolute top-4 left-4 rounded-full border border-[rgba(20,24,33,0.12)] bg-[rgba(20,24,33,0.08)] px-[11px] py-[5px] font-mono text-[10.5px] tracking-[0.08em] uppercase text-[#5b6472]"
			>
				Before
			</div>
			<div
				class="absolute top-4 right-4 rounded-full border border-[rgba(35,213,195,0.3)] bg-[rgba(35,213,195,0.14)] px-[11px] py-[5px] font-mono text-[10.5px] tracking-[0.08em] uppercase text-teal"
			>
				After
			</div>

			<div class="absolute inset-y-0 left-1/2 w-[2px] -translate-x-[1px] bg-[linear-gradient(180deg,transparent,#2fe0ce,transparent)]"></div>
			<div
				class="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(35,213,195,0.5)] bg-[#0b0f16] text-teal shadow-[0_0_0_6px_rgba(6,8,11,0.5),0_0_22px_rgba(35,213,195,0.4)]"
			>
				<MoonIcon width="20" height="20" />
			</div>
		</div>
	</div>
</template>
