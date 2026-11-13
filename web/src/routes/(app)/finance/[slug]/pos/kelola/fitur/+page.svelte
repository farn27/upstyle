<script>
	import { enhance } from '$app/forms';
	import EditorProfilPos from '$lib/components/pos/EditorProfilPos.svelte';

	let { data, form } = $props();

	/** @type {Record<string, boolean>} */
	let overrides = $state({ ...data.activeFeatures });
	let lanjutanTerbuka = $state(false);
	$effect(() => {
		overrides = { ...data.activeFeatures };
	});

	const featureGroups = [
		{
			title: 'Modul industri',
			features: [
				{ key: 'posEnabled', label: 'Modul POS aktif', description: 'Aktifkan jika unit bisnis ini butuh kasir harian.' },
				{ key: 'tableManagement', label: 'Manajemen meja', description: 'Diatur otomatis dari bagian "Meja & denah" di atas bila memakai profil kasir.' },
				{ key: 'kitchenDisplay', label: 'Antrean / dapur', description: 'Diatur otomatis dari bagian "Dapur" di atas bila memakai profil kasir.' },
				{ key: 'appointmentBooking', label: 'Booking / reservasi', description: 'Untuk klinik/salon. Atur slot waktu kedatangan pelanggan.' },
				{ key: 'workOrderTracking', label: 'Pelacakan pengerjaan', description: 'Untuk bengkel/jasa. Lacak status pengerjaan.' }
			]
		},
		{
			title: 'Checkout & pembayaran',
			features: [
				{ key: 'splitPayment', label: 'Bayar dengan beberapa metode', description: 'Misal tunai & QRIS sekaligus.' },
				{ key: 'manualDiscount', label: 'Diskon bebas', description: 'Kasir boleh memasukkan nominal diskon.' },
				{ key: 'openPrice', label: 'Ubah harga', description: 'Kasir boleh mengubah harga jual saat transaksi.' },
				{ key: 'autoCalcChange', label: 'Hitung kembalian otomatis', description: 'Kalkulator kembalian saat bayar tunai.' },
				{ key: 'autoPrintReceipt', label: 'Cetak struk otomatis', description: 'Langsung buka jendela cetak saat transaksi sukses.' }
			]
		},
		{
			title: 'Keamanan & kas',
			features: [
				{ key: 'mandatoryShiftClose', label: 'Wajib buka/tutup shift', description: 'Rekonsiliasi kas di akhir jam kerja.' },
				{ key: 'preventNegativeCash', label: 'Cegah laci kas minus', description: 'Tolak tarik kas melebihi catatan sistem.' },
				{ key: 'requirePinForVoid', label: 'PIN untuk void/retur', description: 'Perlu otorisasi PIN saat retur.' }
			]
		},
		{
			title: 'Tampilan',
			features: [
				{ key: 'barcodeScanner', label: 'Scanner barcode', description: 'Cari barang dengan scanner.' },
				{ key: 'autoFocusScanner', label: 'Fokus otomatis ke pencarian', description: 'Kursor selalu siap untuk scanner.' },
				{ key: 'showStock', label: 'Tampilkan sisa stok', description: 'Jumlah stok di kartu produk.' },
				{ key: 'lowStockAlert', label: 'Peringatan stok tipis', description: 'Tandai produk yang stoknya menipis.' }
			]
		}
	];

	const isModified = $derived(Object.keys(overrides).some((key) => overrides[key] !== data.activeFeatures[key]));
	const pesan = $derived(form?.pesan || '');
	const galat = $derived(form?.error || '');
</script>

<svelte:head><title>Kelola Kasir · {data.unit.nama}</title></svelte:head>

<div class="p-4 sm:p-6 max-w-4xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Kustomisasi Kasir</h1>
		<p class="text-slate-500 dark:text-slate-400 text-sm">Sesuaikan kasir dengan cara usaha <b class="text-slate-700 dark:text-slate-200">{data.unit.nama}</b> berjualan.</p>
	</div>

	<EditorProfilPos profilPos={data.profilPos} kategoriProduk={data.kategoriProduk} usulan={form?.usulan ?? null} {pesan} {galat} />

	<section class="mt-10">
		<button type="button" class="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-left" aria-expanded={lanjutanTerbuka} onclick={() => (lanjutanTerbuka = !lanjutanTerbuka)}>
			<span>
				<span class="block font-black text-slate-900 dark:text-white">Pengaturan lanjutan</span>
				<span class="block text-xs text-slate-500">Saklar fitur kasir satu per satu (kategori {data.category}).</span>
			</span>
			<span class="text-slate-400 text-lg" aria-hidden="true">{lanjutanTerbuka ? '−' : '+'}</span>
		</button>

		{#if lanjutanTerbuka}
			<form method="POST" action="?/updateFeatures" use:enhance class="space-y-8 mt-6">
				{#each featureGroups as group (group.title)}
					<div>
						<h2 class="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">{group.title}</h2>
						<div class="grid gap-3 md:grid-cols-2">
							{#each group.features as feature (feature.key)}
								{@const isOverridden = Object.keys(data.overrideObj).includes(feature.key) && data.overrideObj[feature.key] !== data.defaultFeatures[feature.key]}
								<label class="bg-white dark:bg-slate-800 border {isOverridden ? 'border-orange-200 dark:border-orange-800' : 'border-slate-200 dark:border-slate-700'} p-4 rounded-2xl flex items-start gap-4 justify-between cursor-pointer">
									<span class="flex-1">
										<span class="flex flex-wrap items-center gap-2 mb-1">
											<span class="font-bold text-sm text-slate-800 dark:text-slate-100">{feature.label}</span>
											<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider {isOverridden ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}">{isOverridden ? 'Diubah' : 'Bawaan'}</span>
										</span>
										<span class="block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{feature.description}</span>
									</span>
									<span class="relative inline-flex items-center shrink-0 mt-1">
										<input type="checkbox" name={feature.key} value="true" class="sr-only peer" bind:checked={overrides[feature.key]} />
										<span class="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></span>
									</span>
								</label>
							{/each}
						</div>
					</div>
				{/each}

				<div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
					<button type="submit" formaction="?/resetDefaults" class="text-sm font-bold text-red-500 hover:text-red-600 underline">Kembalikan ke bawaan kategori</button>
					<button type="submit" disabled={!isModified} class="px-6 py-3 rounded-xl font-bold text-sm {isModified ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700'}">Simpan saklar</button>
				</div>
			</form>
		{/if}
	</section>
</div>
