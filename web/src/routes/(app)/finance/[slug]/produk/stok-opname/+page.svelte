<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import SubNav from '$lib/components/SubNav.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	export let data;
	export let form;

	$: slug = $page.params.slug;
	$: products = data.products || [];
</script>

<PageLayout title="Stok Opname" subtitle="Sesuaikan stok fisik dengan stok sistem" {slug} unit={data.unit}>
	<SubNav {slug} />

	{#if form?.message}
		<div class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
			{form.message}
		</div>
	{/if}

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
		{#if products.length === 0}
			<EmptyState title="Belum ada produk" description="Tambahkan produk terlebih dahulu sebelum melakukan stok opname.">
				<a href="/finance/{slug}/produk/add" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
					Tambah Produk
				</a>
			</EmptyState>
		{:else}
			<div class="hidden">
				{#each products as p}
					<form id="opname-{p.id}" method="POST" action="?/adjust" use:enhance>
						<input type="hidden" name="product_id" value={p.id} />
					</form>
				{/each}
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
						<tr>
							<th class="px-4 py-3">Produk</th>
							<th class="px-4 py-3">SKU</th>
							<th class="px-4 py-3 text-center">Stok Sistem</th>
							<th class="px-4 py-3 text-center">Stok Fisik</th>
							<th class="px-4 py-3">Catatan</th>
							<th class="px-4 py-3 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
						{#each products as p}
							<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
								<td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{p.nama}</td>
								<td class="px-4 py-3 text-slate-500 font-mono text-xs">{p.sku || '-'}</td>
								<td class="px-4 py-3 text-center font-bold text-indigo-600">{p.stok}</td>
								<td class="px-4 py-3 text-center">
									<input form="opname-{p.id}" type="number" name="actual_stock" min="0" value={p.stok} class="w-20 mx-auto text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm font-semibold" />
								</td>
								<td class="px-4 py-3">
									<input form="opname-{p.id}" type="text" name="notes" placeholder="Catatan opname" class="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm" />
								</td>
								<td class="px-4 py-3 text-center">
									<button form="opname-{p.id}" type="submit" class="px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition">
										Simpan
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</PageLayout>
