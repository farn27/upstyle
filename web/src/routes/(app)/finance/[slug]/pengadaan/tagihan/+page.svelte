<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import { rp, tgl } from '$lib/pengadaan';

	export let data;

	$: unit = data.unit;
	$: dasar = `/finance/${unit.slug}/pengadaan/tagihan`;

	const labelStatus = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum bayar' };
	const warnaStatus = {
		LUNAS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
		SEBAGIAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
		BELUM_BAYAR: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
	};
</script>

<svelte:head><title>Tagihan Pembelian | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Tagihan Pembelian" subtitle="Faktur dari supplier. Catat dan bayar dari halaman detail PO atau menu Hutang (AP)." badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />

	<div class="flex gap-2 mb-4 text-xs font-bold">
		<a href={dasar} class="px-3 py-1.5 rounded-lg border {data.hanyaBelumLunas ? 'border-slate-200 dark:border-slate-700 text-slate-500' : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300'}">Semua</a>
		<a href="{dasar}?status=belum-lunas" class="px-3 py-1.5 rounded-lg border {data.hanyaBelumLunas ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}">Belum lunas</a>
	</div>

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
		<table class="w-full text-sm min-w-[820px]">
			<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
				<tr>
					<th class="py-2.5 px-4">No. Faktur</th>
					<th class="py-2.5 px-4">Supplier</th>
					<th class="py-2.5 px-4">PO</th>
					<th class="py-2.5 px-4">Jatuh Tempo</th>
					<th class="py-2.5 px-4 text-right">Total</th>
					<th class="py-2.5 px-4 text-right">Sisa</th>
					<th class="py-2.5 px-4">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each data.tagihan as t}
					{@const lewat = t.status !== 'LUNAS' && t.jatuhTempo < data.hariIni}
					<tr>
						<td class="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">{t.nomorFaktur}</td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{t.namaSupplier || '-'}</td>
						<td class="py-2.5 px-4 whitespace-nowrap"><a href="/finance/{unit.slug}/pengadaan/po/{t.poId}" class="font-bold text-indigo-600">{t.poNumber}</a></td>
						<td class="py-2.5 px-4 whitespace-nowrap {lewat ? 'text-rose-600 font-bold' : 'text-slate-500'}">{tgl(t.jatuhTempo)}{lewat ? ' · lewat tempo' : ''}</td>
						<td class="py-2.5 px-4 text-right font-mono whitespace-nowrap">{rp(t.nominal)}</td>
						<td class="py-2.5 px-4 text-right font-mono whitespace-nowrap">{rp(Number(t.nominal) - Number(t.sudahDibayar || 0))}</td>
						<td class="py-2.5 px-4"><span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap {warnaStatus[t.status]}">{labelStatus[t.status]}</span></td>
					</tr>
				{:else}
					<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada tagihan.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</PageLayout>
