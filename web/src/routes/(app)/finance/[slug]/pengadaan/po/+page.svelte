<script>
	import { page } from '$app/stores';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import StatusPO from '$lib/components/pengadaan/StatusPO.svelte';
	import { rp, tgl } from '$lib/pengadaan';

	export let data;

	$: unit = data.unit;
	$: dasar = `/finance/${unit.slug}/pengadaan/po`;

	const pilihanStatus = [
		['', 'Semua status'],
		['terbuka', 'Menunggu barang'],
		['DRAFT', 'Draft'],
		['SENT', 'Dipesan'],
		['PARTIAL', 'Diterima sebagian'],
		['COMPLETED', 'Selesai'],
		['CANCELLED', 'Dibatalkan']
	];

	function urlHalaman(n) {
		const u = new URL($page.url);
		u.searchParams.set('hal', String(n));
		return u.pathname + u.search;
	}

	const kelasInput = 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500';
</script>

<svelte:head><title>Purchase Order | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Purchase Order" subtitle="Semua pesanan barang ke supplier" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<svelte:fragment slot="actions">
		<a href="{dasar}/baru" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold">+ Buat PO</a>
	</svelte:fragment>

	<PengadaanNav slug={unit.slug} />

	<form method="GET" class="flex flex-col sm:flex-row gap-2 mb-4">
		<input type="search" name="q" value={data.filter.q} aria-label="Cari PO" placeholder="Cari nomor PO atau supplier" class="{kelasInput} flex-1" />
		<select name="status" value={data.filter.status} aria-label="Status" class={kelasInput}>
			{#each pilihanStatus as [nilai, label]}
				<option value={nilai}>{label}</option>
			{/each}
		</select>
		<select name="supplier" value={data.filter.supplierId || ''} aria-label="Supplier" class={kelasInput}>
			<option value="">Semua supplier</option>
			{#each data.daftarSupplier as s}
				<option value={s.id}>{s.namaSupplier}</option>
			{/each}
		</select>
		<button class="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold">Terapkan</button>
	</form>

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
		<table class="w-full text-sm min-w-[720px]">
			<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
				<tr>
					<th class="py-2.5 px-4">No. PO</th>
					<th class="py-2.5 px-4">Tanggal</th>
					<th class="py-2.5 px-4">Supplier</th>
					<th class="py-2.5 px-4">Perkiraan Datang</th>
					<th class="py-2.5 px-4 text-right">Total</th>
					<th class="py-2.5 px-4">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each data.pos as po}
					<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
						<td class="py-2.5 px-4"><a href="{dasar}/{po.id}" class="font-bold text-indigo-600">{po.poNumber}</a></td>
						<td class="py-2.5 px-4 text-slate-500">{tgl(po.createdAt)}</td>
						<td class="py-2.5 px-4 text-slate-700 dark:text-slate-200">{po.namaSupplier || '-'}</td>
						<td class="py-2.5 px-4 text-slate-500">{tgl(po.expectedDate)}</td>
						<td class="py-2.5 px-4 text-right font-mono">{rp(po.totalAmount)}</td>
						<td class="py-2.5 px-4"><StatusPO status={po.status} /></td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="py-12 text-center text-slate-400">
							{data.filter.q || data.filter.status || data.filter.supplierId ? 'Tidak ada PO yang cocok dengan filter ini.' : 'Belum ada Purchase Order.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.jumlahHalaman > 1}
		<div class="flex items-center justify-between mt-4 text-sm text-slate-500">
			<span>{data.jumlah} PO · Halaman {data.halaman} dari {data.jumlahHalaman}</span>
			<div class="flex gap-2">
				{#if data.halaman > 1}<a class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold" href={urlHalaman(data.halaman - 1)}>Sebelumnya</a>{/if}
				{#if data.halaman < data.jumlahHalaman}<a class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold" href={urlHalaman(data.halaman + 1)}>Berikutnya</a>{/if}
			</div>
		</div>
	{/if}
</PageLayout>
