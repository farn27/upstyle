<script>
	/**
	 * Stock Alert Banner
	 * Tampilkan peringatan stok menipis di dashboard, bisa dismiss
	 */
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	export let unitId;
	export let slug;

	/** @type {Array<{nama: string, stok: number, min_stok: number, sku: string}>} */
	let alerts = [];
	let dismissed = false;
	let loading = true;

	onMount(async () => {
		try {
			const res = await fetch(`/api/low-stock?unitId=${unitId}`);
			if (res.ok) {
				const data = await res.json();
				alerts = data.data || [];
			}
		} catch { /* silent */ } finally {
			loading = false;
		}
	});
</script>

{#if !loading && alerts.length > 0 && !dismissed}
	<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 sm:p-4"
		in:slide out:fade>
		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
			<div class="flex items-start gap-3">
				<div class="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg shrink-0">
					<svg class="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
					</svg>
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-200">
						⚠️ {alerts.length} Produk Stok Menipis
					</p>
					<div class="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
						{#each alerts.slice(0, 5) as a}
							<span class="text-[10px] sm:text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-1.5 sm:px-2 py-0.5 rounded font-medium">
								{a.nama} <b class="text-amber-900 dark:text-amber-100">{a.stok}</b>/{a.min_stok}
							</span>
						{/each}
						{#if alerts.length > 5}
							<span class="text-[10px] sm:text-xs text-amber-500 font-medium">+{alerts.length - 5} lainnya</span>
						{/if}
					</div>
				</div>
			</div>
			<div class="flex items-center gap-2 shrink-0 sm:justify-end">
				<a href="/finance/{slug}/produk" class="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap">
					Kelola Stok
				</a>
				<button on:click={() => dismissed = true}
					class="text-amber-400 hover:text-amber-600 transition p-1">
					<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}
