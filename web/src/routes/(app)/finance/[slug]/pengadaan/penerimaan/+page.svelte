<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import { tgl } from '$lib/pengadaan';

	export let data;

	$: unit = data.unit;
</script>

<svelte:head><title>Penerimaan Barang | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Penerimaan Barang" subtitle="Barang masuk dari supplier. Terima barang dari halaman detail PO." badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
		<table class="w-full text-sm min-w-[720px]">
			<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
				<tr>
					<th class="py-2.5 px-4">No. Penerimaan</th>
					<th class="py-2.5 px-4">Tanggal</th>
					<th class="py-2.5 px-4">PO</th>
					<th class="py-2.5 px-4">Supplier</th>
					<th class="py-2.5 px-4">Barang</th>
					<th class="py-2.5 px-4">Surat Jalan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each data.penerimaan as p}
					<tr>
						<td class="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{p.nomor}</td>
						<td class="py-2.5 px-4 text-slate-500 whitespace-nowrap">{tgl(p.tanggal)}</td>
						<td class="py-2.5 px-4 whitespace-nowrap"><a href="/finance/{unit.slug}/pengadaan/po/{p.poId}" class="font-bold text-indigo-600">{p.poNumber}</a></td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.namaSupplier || '-'}</td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.ringkasan}</td>
						<td class="py-2.5 px-4 text-slate-500">{p.noSuratJalan || '-'}</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="py-12 text-center text-slate-400">Belum ada barang yang diterima.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</PageLayout>
