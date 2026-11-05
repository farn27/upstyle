<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import { rp, tgl } from '$lib/pengadaan';

	export let data;

	$: unit = data.unit;
</script>

<svelte:head><title>Retur Pembelian | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Retur Pembelian" subtitle="Barang yang dikembalikan ke supplier. Catat retur dari halaman detail PO." badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
		<table class="w-full text-sm min-w-[780px]">
			<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
				<tr>
					<th class="py-2.5 px-4">No. Retur</th>
					<th class="py-2.5 px-4">Tanggal</th>
					<th class="py-2.5 px-4">PO</th>
					<th class="py-2.5 px-4">Supplier</th>
					<th class="py-2.5 px-4">Barang</th>
					<th class="py-2.5 px-4">Alasan</th>
					<th class="py-2.5 px-4 text-right">Potong Hutang</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each data.retur as r}
					<tr>
						<td class="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{r.nomor}</td>
						<td class="py-2.5 px-4 text-slate-500 whitespace-nowrap">{tgl(r.tanggal)}</td>
						<td class="py-2.5 px-4 whitespace-nowrap"><a href="/finance/{unit.slug}/pengadaan/po/{r.poId}" class="font-bold text-indigo-600">{r.poNumber}</a></td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{r.namaSupplier || '-'}</td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{r.ringkasan}</td>
						<td class="py-2.5 px-4 text-slate-500">{r.alasan || '-'}</td>
						<td class="py-2.5 px-4 text-right font-mono whitespace-nowrap">{rp(r.nilaiPotongHutang)}</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada retur.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</PageLayout>
