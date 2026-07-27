<script>
	export let title = 'Belum ada data';
	export let description = 'Data akan muncul di sini setelah Anda menambahkan entri pertama.';
	export let icon = 'inbox';
</script>

<div class="flex flex-col items-center justify-center py-16 px-6 text-center">
	<div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
		{#if icon === 'inbox'}
			<svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
			</svg>
		{:else if icon === 'users'}
			<svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		{:else}
			<svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
		{/if}
	</div>
	<h3 class="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
	<p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>
	{#if $$slots.default}
		<div class="mt-5">
			<slot />
		</div>
	{/if}
</div>
