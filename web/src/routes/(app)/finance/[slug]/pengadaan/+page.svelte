<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import StatusPO from '$lib/components/pengadaan/StatusPO.svelte';
	import { rp, tgl } from '$lib/pengadaan';

	export let data;

	$: unit = data.unit;
	$: r = data.ringkasan;
	$: dasar = `/finance/${unit.slug}/pengadaan`;
	$: kartu = [
		{ judul: 'PO menunggu barang', nilai: r.jumlahTerbuka, sub: rp(r.nilaiTerbuka), href: `${dasar}/po?status=terbuka` },
		{ judul: 'Pembelian bulan ini', nilai: rp(r.pembelianBulanIni), sub: 'Dari tagihan supplier', href: `${dasar}/tagihan` },
		{ judul: 'Sisa hutang pembelian', nilai: rp(r.sisaHutang), sub: r.hutangLewatTempo > 0 ? `${rp(r.hutangLewatTempo)} lewat tempo` : 'Tidak ada yang lewat tempo', href: `${dasar}/tagihan?status=belum-lunas`, bahaya: r.hutangLewatTempo > 0 },
		{ judul: 'Draft belum dikirim', nilai: r.jumlahDraft, sub: 'Perlu ditinjau', href: `${dasar}/po?status=DRAFT` }
	];
</script>

<svelte:head><title>Pengadaan | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Pengadaan Barang" subtitle="Pesan, terima, dan bayar barang dari supplier" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<svelte:fragment slot="actions">
		<a href="{dasar}/po/baru" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold">+ Buat PO</a>
	</svelte:fragment>

	<PengadaanNav slug={unit.slug} />

	<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
		{#each kartu as k}
			<a href={k.href} class="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 transition-colors">
				<p class="text-xs font-bold text-slate-500 dark:text-slate-400">{k.judul}</p>
				<p class="text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">{k.nilai}</p>
				<p class="text-xs mt-1 {k.bahaya ? 'text-rose-600 font-bold' : 'text-slate-400'}">{k.sub}</p>
			</a>
		{/each}
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
		<section class="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
			<div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-sm text-slate-800 dark:text-slate-100">PO Terbaru</h2>
				<a href="{dasar}/po" class="text-xs font-bold text-indigo-600">Lihat semua</a>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm min-w-[520px]">
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
						{#each data.terbaru as po}
							<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
								<td class="py-2.5 px-4"><a href="{dasar}/po/{po.id}" class="font-bold text-indigo-600">{po.poNumber}</a></td>
								<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{po.namaSupplier || '-'}</td>
								<td class="py-2.5 px-4 text-right font-mono">{rp(po.totalAmount)}</td>
								<td class="py-2.5 px-4 text-right"><StatusPO status={po.status} /></td>
							</tr>
						{:else}
							<tr>
								<td class="py-10 text-center text-slate-400">
									Belum ada Purchase Order.
									<a href="{dasar}/po/baru" class="block mt-1 font-bold text-indigo-600">Buat PO pertama</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<div class="space-y-5">
			<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
				<h2 class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">Barang Terlambat Datang</h2>
				<ul class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
					{#each data.terlambat as po}
						<li class="px-4 py-2.5 flex justify-between gap-3">
							<a href="{dasar}/po/{po.id}" class="font-bold text-indigo-600 truncate">{po.poNumber}</a>
							<span class="text-xs text-rose-600 font-bold whitespace-nowrap">{tgl(po.expectedDate)}</span>
						</li>
					{:else}
						<li class="px-4 py-6 text-center text-slate-400">Tidak ada yang terlambat.</li>
					{/each}
				</ul>
			</section>

			<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
					<h2 class="font-bold text-sm text-slate-800 dark:text-slate-100">Stok Menipis</h2>
					<a href="{dasar}/restock" class="text-xs font-bold text-indigo-600">Saran restock</a>
				</div>
				<ul class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
					{#each data.stokMenipis as p}
						<li class="px-4 py-2.5 flex justify-between gap-3">
							<span class="truncate text-slate-700 dark:text-slate-200">{p.nama}</span>
							<span class="text-xs font-bold text-amber-600 whitespace-nowrap">{p.stok ?? 0} / min {p.minStok}</span>
						</li>
					{:else}
						<li class="px-4 py-6 text-center text-slate-400">Semua stok aman.</li>
					{/each}
				</ul>
			</section>
		</div>
	</div>
</PageLayout>
