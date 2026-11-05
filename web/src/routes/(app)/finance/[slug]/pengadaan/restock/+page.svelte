<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import { rp } from '$lib/pengadaan';
	import { JENIS_PRODUK, normalisasiJenis } from '$lib/jenisProduk';

	export let data;

	$: unit = data.unit;

	/** @type {Record<string, boolean>} */
	let pilih = {};
	/** @type {Record<string, number>} */
	let jumlah = {};

	$: for (const p of data.produk) {
		if (jumlah[p.id] === undefined) jumlah[p.id] = p.saran || 1;
		if (pilih[p.id] === undefined) pilih[p.id] = p.saran > 0;
	}
	$: terpilih = data.produk.filter((p) => pilih[p.id] && Number(jumlah[p.id]) > 0);
	$: supplierUnik = [...new Set(terpilih.map((p) => p.supplierId).filter(Boolean))];
	$: tautanPO = `/finance/${unit.slug}/pengadaan/po/baru?produk=${terpilih.map((p) => encodeURIComponent(`${p.id}:${jumlah[p.id]}`)).join(',')}${supplierUnik.length === 1 ? `&supplier=${supplierUnik[0]}` : ''}`;
</script>

<svelte:head><title>Saran Restock | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Saran Restock" subtitle="Produk yang stoknya sudah di bawah atau sama dengan batas minimum" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<svelte:fragment slot="actions">
		{#if terpilih.length > 0}
			<a href={tautanPO} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold">Buat PO ({terpilih.length} produk)</a>
		{/if}
	</svelte:fragment>

	<PengadaanNav slug={unit.slug} />

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
		<table class="w-full text-sm min-w-[760px]">
			<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
				<tr>
					<th class="py-2.5 px-4 w-10"><span class="sr-only">Pilih</span></th>
					<th class="py-2.5 px-4">Produk</th>
					<th class="py-2.5 px-4 text-center">Stok</th>
					<th class="py-2.5 px-4 text-center">Minimum</th>
					<th class="py-2.5 px-4 text-center">Sedang Dipesan</th>
					<th class="py-2.5 px-4">Supplier</th>
					<th class="py-2.5 px-4 text-right">Harga Beli</th>
					<th class="py-2.5 px-4 w-28">Pesan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each data.produk as p (p.id)}
					<tr>
						<td class="py-2.5 px-4"><input type="checkbox" aria-label="Pilih {p.nama}" bind:checked={pilih[p.id]} /></td>
						<td class="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-100">
							{p.nama}
							<span class="block text-xs font-normal text-slate-400">{p.sku ? `${p.sku} · ` : ''}<span class="font-bold px-1 rounded {JENIS_PRODUK[normalisasiJenis(p.jenis)].warna}">{JENIS_PRODUK[normalisasiJenis(p.jenis)].singkat}</span></span>
						</td>
						<td class="py-2.5 px-4 text-center font-bold text-amber-600">{p.stok ?? 0}</td>
						<td class="py-2.5 px-4 text-center">{p.minStok}</td>
						<td class="py-2.5 px-4 text-center">{p.sedangDipesan || '-'}</td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.namaSupplier || '-'}</td>
						<td class="py-2.5 px-4 text-right font-mono whitespace-nowrap">{rp(p.hargaBeli)}</td>
						<td class="py-2.5 px-4">
							<input type="number" aria-label="Jumlah pesan {p.nama}" min="1" step="1" bind:value={jumlah[p.id]} class="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-indigo-500" />
						</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="py-12 text-center text-slate-400">Semua stok masih aman.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</PageLayout>
