<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { flattenNavItems } from '$lib/navItems.js';

	export let isOpen = false;

	$: slug = $page.params.slug || '';
	let search = '';

	// Svelte action: focus elemen tanpa autofocus attribute (fix a11y warning)
	function focusOnMount(node) {
		// Delay kecil agar transisi selesai dulu
		const t = setTimeout(() => node.focus(), 50);
		return { destroy: () => clearTimeout(t) };
	}

	$: allItems = flattenNavItems(slug);

	$: filteredItems = allItems.filter((item) => {
		if (!slug) {
			const needsSlug =
				item.path.includes('/finance/') ||
				item.path.includes('/sales/') ||
				item.path.includes('/marketing/') ||
				item.path.includes('/customer-service/') ||
				item.path.includes('/ecommerce/');
			if (needsSlug && item.path !== '/finance/create' && item.path !== '/finance') return false;
		}
		if (!search) return true;
		const q = search.toLowerCase();
		return (
			item.name.toLowerCase().includes(q) ||
			item.desc?.toLowerCase().includes(q) ||
			item.cat?.toLowerCase().includes(q)
		);
	});

	let selectedIndex = 0;
	$: if (search) selectedIndex = 0;

	function navigateTo(path) {
		isOpen = false;
		search = '';
		goto(path);
	}

	function handleKeyDown(e) {
		if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			isOpen = !isOpen;
		}
		if (!isOpen) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % filteredItems.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredItems[selectedIndex]) navigateTo(filteredItems[selectedIndex].path);
		} else if (e.key === 'Escape') {
			isOpen = false;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

{#if isOpen}
	<div
		in:fade={{ duration: 100 }}
		out:fade={{ duration: 100 }}
		class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 px-4"
	>
		<div class="fixed inset-0" role="button" tabindex="-1" aria-label="Tutup pencarian"
             on:click={() => (isOpen = false)}
             on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}></div>

		<div
			in:scale={{ start: 0.98, duration: 150 }}
			class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10 flex flex-col max-h-[520px]"
		>
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
				<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					bind:value={search}
					placeholder="Cari modul atau halaman..."
					class="w-full text-sm outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent"
					use:focusOnMount
				/>
				<span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded font-mono">ESC</span>
			</div>

			<div class="overflow-y-auto p-2 flex-1">
				{#if filteredItems.length === 0}
					<div class="p-10 text-center text-sm text-slate-400">Tidak ada halaman yang cocok.</div>
				{:else}
					{@const grouped = filteredItems.reduce((acc, item) => {
						if (!acc[item.cat]) acc[item.cat] = [];
						acc[item.cat].push(item);
						return acc;
					}, {})}

					{#each Object.entries(grouped) as [cat, categoryItems]}
						<div class="p-1 space-y-0.5 mb-2">
							<span class="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider block">{cat}</span>

							{#each categoryItems as item}
								{@const overallIndex = filteredItems.indexOf(item)}
								<button
									on:click={() => navigateTo(item.path)}
									class="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors
										{overallIndex === selectedIndex
										? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200'
										: 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'}"
								>
									<div>
										<p class="text-sm font-semibold leading-snug">{item.name}</p>
										<p class="text-xs text-slate-400 mt-0.5">{item.desc}</p>
									</div>
									{#if overallIndex === selectedIndex}
										<span class="text-xs font-mono text-indigo-500 shrink-0 ml-2">↵</span>
									{/if}
								</button>
							{/each}
						</div>
					{/each}
				{/if}
			</div>

			<div class="bg-slate-50 dark:bg-slate-900 p-3 px-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
				<div class="flex items-center gap-3">
					<span>↑↓ navigasi</span>
					<span>↵ pilih</span>
				</div>
				<span class="font-medium">Ctrl+K</span>
			</div>
		</div>
	</div>
{/if}
