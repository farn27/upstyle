<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import { rp } from '$lib/pengadaan';

	export let data;

	$: unit = data.unit;
	$: r = data.ringkasan;
	$: kartu = [
		['Total pembelian', rp(r.total)],
		['Jumlah faktur', Number(r.jumlah)],
		['Diskon didapat', rp(r.diskon)],
		['PPN masukan', rp(r.ppn)]
	];

	const kelasInput = 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500';
</script>

<svelte:head><title>Laporan Pembelian | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Laporan Pembelian" subtitle="Dihitung dari tagihan supplier pada periode terpilih" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />

	<form method="GET" class="flex flex-wrap items-end gap-2 mb-5">
		<div>
			<label for="dari" class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Dari</label>
			<input id="dari" type="date" name="dari" value={data.dari} class={kelasInput} />
		</div>
		<div>
			<label for="sampai" class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sampai</label>
			<input id="sampai" type="date" name="sampai" value={data.sampai} class={kelasInput} />
		</div>
		<button class="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold">Terapkan</button>
	</form>

	<div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
		{#each kartu as [judul, nilai]}
			<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
				<p class="text-xs font-bold text-slate-500 dark:text-slate-400">{judul}</p>
				<p class="text-xl font-black text-slate-900 dark:text-white mt-1 truncate">{nilai}</p>
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
		<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
			<h2 class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">Per Supplier</h2>
			<table class="w-full text-sm">
				<thead class="text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
					<tr><th class="py-2 px-4">Supplier</th><th class="py-2 px-4 text-center">Faktur</th><th class="py-2 px-4 text-right">Total</th></tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					{#each data.perSupplier as s}
						<tr>
							<td class="py-2 px-4 text-slate-700 dark:text-slate-200">{s.nama || '-'}</td>
							<td class="py-2 px-4 text-center">{Number(s.jumlah)}</td>
							<td class="py-2 px-4 text-right font-mono whitespace-nowrap">{rp(s.total)}</td>
						</tr>
					{:else}
						<tr><td colspan="3" class="py-10 text-center text-slate-400">Tidak ada pembelian pada periode ini.</td></tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
			<h2 class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">Per Produk (sebelum diskon & pajak)</h2>
			<table class="w-full text-sm">
				<thead class="text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
					<tr><th class="py-2 px-4">Produk</th><th class="py-2 px-4 text-center">Jumlah</th><th class="py-2 px-4 text-right">Nilai</th></tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					{#each data.perProduk as p}
						<tr>
							<td class="py-2 px-4 text-slate-700 dark:text-slate-200">{p.nama || 'Produk terhapus'}</td>
							<td class="py-2 px-4 text-center">{Number(p.qty)}</td>
							<td class="py-2 px-4 text-right font-mono whitespace-nowrap">{rp(p.nilai)}</td>
						</tr>
					{:else}
						<tr><td colspan="3" class="py-10 text-center text-slate-400">Tidak ada pembelian pada periode ini.</td></tr>
					{/each}
				</tbody>
			</table>
		</section>
	</div>
</PageLayout>
