<script>
	import { enhance } from '$app/forms';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import PesanForm from '$lib/components/pengadaan/PesanForm.svelte';
	import StatusPO from '$lib/components/pengadaan/StatusPO.svelte';
	import { hitungPorsi, hitungTotalPO, rp, sisaDiretur, sisaDiterima, sisaDitagih, tgl } from '$lib/pengadaan';

	export let data;
	export let form;

	$: unit = data.unit;
	$: po = data.po;
	$: items = data.items;
	$: dasar = `/finance/${unit.slug}/pengadaan/po`;
	$: barisHitung = items.map((i) => ({ qty: i.qtyOrdered, unitPrice: i.unitPrice }));
	$: total = hitungTotalPO(barisHitung, po);

	$: bisaTerima = ['SENT', 'PARTIAL'].includes(po.status) && items.some((i) => sisaDiterima(i) > 0);
	$: bisaTagih = items.some((i) => sisaDitagih(i) > 0);
	$: bisaRetur = items.some((i) => sisaDiretur(i) > 0);

	/** @type {'' | 'terima' | 'tagih' | 'retur'} */
	let panel = '';
	/** @type {any} */
	let bayarUntuk = null;
	let sedangKirim = false;
	/** @type {Record<number, number | ''>} */
	let qtyTagih = {};

	$: subtotalPO = total.subtotal;
	$: nilaiTagih = items.reduce((s, i) => s + Number(qtyTagih[i.id] || 0) * Number(i.unitPrice), 0);
	$: porsiTagih = hitungPorsi(nilaiTagih, subtotalPO, po);

	function bukaPanel(/** @type {'terima' | 'tagih' | 'retur'} */ nama) {
		panel = panel === nama ? '' : nama;
		if (nama === 'tagih') qtyTagih = Object.fromEntries(items.map((i) => [i.id, sisaDitagih(i) || '']));
	}

	/** Form aksi: tutup panel kalau berhasil, tetap buka kalau gagal agar isian tidak hilang */
	function kirimForm(/** @type {string} */ [konfirmasi] = []) {
		return (/** @type {any} */ { cancel }) => {
			if (konfirmasi && !confirm(konfirmasi)) return cancel();
			sedangKirim = true;
			return async (/** @type {any} */ { result, update }) => {
				if (result.type === 'success') {
					panel = '';
					bayarUntuk = null;
				}
				await update({ reset: result.type === 'success' });
				sedangKirim = false;
				if (result.type === 'failure') window.scrollTo({ top: 0, behavior: 'smooth' });
			};
		};
	}

	const kelasInput = 'w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none';
	const kelasLabel = 'block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1';
	const kelasAksi = 'px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700';
	const kelasUtama = 'px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40';
	const kelasKartu = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl';
</script>

<svelte:head><title>{po.poNumber} | {unit.namaUnit}</title></svelte:head>

<PageLayout title={po.poNumber} subtitle={data.supplier?.namaSupplier || 'Purchase Order'} badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />
	<PesanForm {form} />

	<div class="flex flex-wrap items-center gap-2 mb-5">
		<StatusPO status={po.status} />
		<div class="flex-1"></div>
		<a href="{dasar}/{po.id}/cetak" target="_blank" rel="noopener" class={kelasAksi}>Cetak</a>
		{#if po.status === 'DRAFT'}
			<a href="{dasar}/{po.id}/edit" class={kelasAksi}>Ubah</a>
			<form method="POST" action="?/hapus" use:enhance={kirimForm(['Hapus draft PO ini?'])}>
				<button class="{kelasAksi} text-rose-600 dark:text-rose-400">Hapus</button>
			</form>
			<form method="POST" action="?/kirim" use:enhance={kirimForm(['Kirim PO ini ke supplier? Setelah dikirim, PO tidak bisa diubah lagi.'])}>
				<button class={kelasUtama} disabled={sedangKirim}>Kirim ke Supplier</button>
			</form>
		{/if}
		{#if po.status === 'SENT'}
			<form method="POST" action="?/batal" use:enhance={kirimForm(['Batalkan PO ini?'])}>
				<button class="{kelasAksi} text-rose-600 dark:text-rose-400">Batalkan</button>
			</form>
		{/if}
		{#if po.status === 'PARTIAL'}
			<form method="POST" action="?/tutup" use:enhance={kirimForm(['Tutup PO? Sisa barang yang belum datang tidak ditunggu lagi.'])}>
				<button class={kelasAksi}>Tutup PO</button>
			</form>
		{/if}
		{#if bisaRetur}<button type="button" class={kelasAksi} on:click={() => bukaPanel('retur')}>Retur</button>{/if}
		{#if bisaTagih}<button type="button" class={kelasAksi} on:click={() => bukaPanel('tagih')}>Catat Tagihan</button>{/if}
		{#if bisaTerima}<button type="button" class={kelasUtama} on:click={() => bukaPanel('terima')}>Terima Barang</button>{/if}
	</div>

	{#if po.status === 'CANCELLED' && po.alasanBatal}
		<p class="mb-4 text-sm text-slate-500">Alasan batal: {po.alasanBatal}</p>
	{/if}

	{#if panel === 'terima'}
		<form method="POST" action="?/terima" use:enhance={kirimForm()} class="{kelasKartu} p-5 mb-5 space-y-4">
			<h2 class="font-bold text-slate-800 dark:text-slate-100">Terima Barang</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="tanggalTerima" class={kelasLabel}>Tanggal terima</label>
					<input id="tanggalTerima" type="date" name="tanggal" value={data.hariIni} required class={kelasInput} />
				</div>
				<div>
					<label for="noSuratJalan" class={kelasLabel}>No. surat jalan</label>
					<input id="noSuratJalan" name="noSuratJalan" maxlength="100" class={kelasInput} />
				</div>
			</div>
			<div class="space-y-2">
				{#each items.filter((i) => sisaDiterima(i) > 0) as item}
					<div class="flex items-center gap-3">
						<label for="terima{item.id}" class="flex-1 text-sm text-slate-700 dark:text-slate-200">
							{item.namaProduk || item.productId}
							<span class="block text-xs text-slate-400">Sisa pesanan {sisaDiterima(item)}</span>
						</label>
						<input id="terima{item.id}" type="number" name="qty_{item.id}" min="0" max={sisaDiterima(item)} step="1" value={sisaDiterima(item)} class="{kelasInput} !w-28 text-center" />
					</div>
				{/each}
			</div>
			<div>
				<label for="catatanTerima" class={kelasLabel}>Catatan</label>
				<input id="catatanTerima" name="catatan" class={kelasInput} />
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class={kelasAksi} on:click={() => (panel = '')}>Batal</button>
				<button class={kelasUtama} disabled={sedangKirim}>{sedangKirim ? 'Menyimpan...' : 'Simpan Penerimaan'}</button>
			</div>
		</form>
	{/if}

	{#if panel === 'tagih'}
		<form method="POST" action="?/tagih" use:enhance={kirimForm()} class="{kelasKartu} p-5 mb-5 space-y-4">
			<div>
				<h2 class="font-bold text-slate-800 dark:text-slate-100">Catat Tagihan Supplier</h2>
				<p class="text-xs text-slate-500 mt-0.5">Masuk ke Hutang (AP) dan jurnal: persediaan bertambah, hutang bertambah.</p>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div>
					<label for="nomorFaktur" class={kelasLabel}>No. faktur supplier <span class="text-rose-500">*</span></label>
					<input id="nomorFaktur" name="nomorFaktur" required maxlength="50" class={kelasInput} />
				</div>
				<div>
					<label for="tanggalFaktur" class={kelasLabel}>Tanggal faktur</label>
					<input id="tanggalFaktur" type="date" name="tanggal" value={data.hariIni} required class={kelasInput} />
				</div>
				<div>
					<label for="jatuhTempo" class={kelasLabel}>Jatuh tempo</label>
					<input id="jatuhTempo" type="date" name="jatuhTempo" value={data.jatuhTempoAwal} required class={kelasInput} />
				</div>
			</div>
			<div class="space-y-2">
				{#each items.filter((i) => sisaDitagih(i) > 0) as item}
					<div class="flex items-center gap-3">
						<label for="tagih{item.id}" class="flex-1 text-sm text-slate-700 dark:text-slate-200">
							{item.namaProduk || item.productId}
							<span class="block text-xs text-slate-400">Belum ditagih {sisaDitagih(item)} · {rp(item.unitPrice)}/unit</span>
						</label>
						<input id="tagih{item.id}" type="number" name="qty_{item.id}" min="0" max={sisaDitagih(item)} step="1" bind:value={qtyTagih[item.id]} class="{kelasInput} !w-28 text-center" />
					</div>
				{/each}
			</div>
			<dl class="text-sm space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3 max-w-xs ml-auto">
				<div class="flex justify-between"><dt class="text-slate-500">Nilai barang</dt><dd class="font-mono">{rp(porsiTagih.nilaiBarang)}</dd></div>
				<div class="flex justify-between"><dt class="text-slate-500">Diskon</dt><dd class="font-mono">-{rp(porsiTagih.diskon)}</dd></div>
				<div class="flex justify-between"><dt class="text-slate-500">Ongkos kirim</dt><dd class="font-mono">{rp(porsiTagih.ongkir)}</dd></div>
				<div class="flex justify-between"><dt class="text-slate-500">PPN</dt><dd class="font-mono">{rp(porsiTagih.ppn)}</dd></div>
				<div class="flex justify-between font-bold text-slate-900 dark:text-white"><dt>Total tagihan</dt><dd class="font-mono">{rp(porsiTagih.total)}</dd></div>
			</dl>
			<div class="flex justify-end gap-2">
				<button type="button" class={kelasAksi} on:click={() => (panel = '')}>Batal</button>
				<button class={kelasUtama} disabled={sedangKirim || porsiTagih.total <= 0}>{sedangKirim ? 'Menyimpan...' : 'Simpan Tagihan'}</button>
			</div>
		</form>
	{/if}

	{#if panel === 'retur'}
		<form method="POST" action="?/retur" use:enhance={kirimForm(['Catat retur ini? Stok produk akan berkurang.'])} class="{kelasKartu} p-5 mb-5 space-y-4">
			<div>
				<h2 class="font-bold text-slate-800 dark:text-slate-100">Retur ke Supplier</h2>
				<p class="text-xs text-slate-500 mt-0.5">Stok berkurang. Kalau barangnya sudah ditagih, sisa hutang PO ini ikut terpotong.</p>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="tanggalRetur" class={kelasLabel}>Tanggal retur</label>
					<input id="tanggalRetur" type="date" name="tanggal" value={data.hariIni} required class={kelasInput} />
				</div>
				<div>
					<label for="alasanRetur" class={kelasLabel}>Alasan <span class="text-rose-500">*</span></label>
					<input id="alasanRetur" name="alasan" required maxlength="255" placeholder="Contoh: barang rusak saat diterima" class={kelasInput} />
				</div>
			</div>
			<div class="space-y-2">
				{#each items.filter((i) => sisaDiretur(i) > 0) as item}
					<div class="flex items-center gap-3">
						<label for="retur{item.id}" class="flex-1 text-sm text-slate-700 dark:text-slate-200">
							{item.namaProduk || item.productId}
							<span class="block text-xs text-slate-400">Maksimal {sisaDiretur(item)}</span>
						</label>
						<input id="retur{item.id}" type="number" name="qty_{item.id}" min="0" max={sisaDiretur(item)} step="1" placeholder="0" class="{kelasInput} !w-28 text-center" />
					</div>
				{/each}
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class={kelasAksi} on:click={() => (panel = '')}>Batal</button>
				<button class={kelasUtama} disabled={sedangKirim}>{sedangKirim ? 'Menyimpan...' : 'Simpan Retur'}</button>
			</div>
		</form>
	{/if}

	<div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
		<section class="xl:col-span-2 {kelasKartu} overflow-x-auto">
			<table class="w-full text-sm min-w-[640px]">
				<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400">
					<tr>
						<th class="py-2.5 px-4 text-left">Produk</th>
						<th class="py-2.5 px-3 text-right">Harga</th>
						<th class="py-2.5 px-3 text-center">Dipesan</th>
						<th class="py-2.5 px-3 text-center">Diterima</th>
						<th class="py-2.5 px-3 text-center">Ditagih</th>
						<th class="py-2.5 px-3 text-center">Retur</th>
						<th class="py-2.5 px-4 text-right">Subtotal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					{#each items as item}
						<tr>
							<td class="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-100">
								{item.namaProduk || item.productId}
								{#if item.sku}<span class="block text-xs font-normal text-slate-400">{item.sku}</span>{/if}
							</td>
							<td class="py-2.5 px-3 text-right font-mono whitespace-nowrap">{rp(item.unitPrice)}</td>
							<td class="py-2.5 px-3 text-center">{item.qtyOrdered}</td>
							<td class="py-2.5 px-3 text-center {sisaDiterima(item) === 0 ? 'text-emerald-600 font-bold' : ''}">{item.qtyReceived ?? 0}</td>
							<td class="py-2.5 px-3 text-center">{item.qtyInvoiced ?? 0}</td>
							<td class="py-2.5 px-3 text-center">{item.qtyReturned ?? 0}</td>
							<td class="py-2.5 px-4 text-right font-mono whitespace-nowrap">{rp(item.totalPrice)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="{kelasKartu} p-5 text-sm space-y-4">
			<dl class="space-y-1.5">
				<div class="flex justify-between"><dt class="text-slate-500">Subtotal</dt><dd class="font-mono">{rp(total.subtotal)}</dd></div>
				<div class="flex justify-between"><dt class="text-slate-500">Diskon</dt><dd class="font-mono">-{rp(total.diskon)}</dd></div>
				<div class="flex justify-between"><dt class="text-slate-500">Ongkos kirim</dt><dd class="font-mono">{rp(total.ongkir)}</dd></div>
				<div class="flex justify-between"><dt class="text-slate-500">PPN ({Number(po.ppnPersen || 0)}%)</dt><dd class="font-mono">{rp(total.ppn)}</dd></div>
				<div class="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-base text-slate-900 dark:text-white"><dt>Total</dt><dd class="font-mono">{rp(po.totalAmount)}</dd></div>
			</dl>
			<dl class="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-700">
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Dibuat</dt><dd>{tgl(po.createdAt)}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Perkiraan datang</dt><dd>{tgl(po.expectedDate)}</dd></div>
				{#if data.supplier?.detail?.phone}<div class="flex justify-between gap-3"><dt class="text-slate-500">Telepon</dt><dd>{data.supplier.detail.phone}</dd></div>{/if}
			</dl>
			{#if po.notes}<p class="pt-3 border-t border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-pre-line">{po.notes}</p>{/if}
		</section>
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
		<section class={kelasKartu}>
			<h2 class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">Riwayat Penerimaan</h2>
			<ul class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
				{#each data.penerimaan as p}
					<li class="px-4 py-3">
						<div class="flex justify-between gap-3"><span class="font-bold">{p.nomor}</span><span class="text-xs text-slate-500 whitespace-nowrap">{tgl(p.tanggal)}</span></div>
						<p class="text-xs text-slate-500 mt-1">{p.ringkasan}</p>
						{#if p.noSuratJalan}<p class="text-xs text-slate-400 mt-0.5">Surat jalan {p.noSuratJalan}</p>{/if}
					</li>
				{:else}
					<li class="px-4 py-6 text-center text-slate-400">Belum ada barang diterima.</li>
				{/each}
			</ul>
		</section>

		<section class={kelasKartu}>
			<h2 class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">Tagihan & Pembayaran</h2>
			<ul class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
				{#each data.tagihan as t}
					{@const sisa = Number(t.nominalHutang) - Number(t.sudahDibayar || 0)}
					<li class="px-4 py-3">
						<div class="flex justify-between gap-3"><span class="font-bold">{t.nomorFaktur}</span><span class="font-mono whitespace-nowrap">{rp(t.nominalHutang)}</span></div>
						<div class="flex justify-between items-center gap-3 mt-1">
							<span class="text-xs text-slate-500">Tempo {tgl(t.jatuhTempo)} · {t.statusHutang === 'LUNAS' ? 'Lunas' : `sisa ${rp(sisa)}`}</span>
							{#if t.statusHutang !== 'LUNAS'}
								<button type="button" class="text-xs font-bold text-indigo-600" on:click={() => (bayarUntuk = { ...t, sisa })}>Bayar</button>
							{/if}
						</div>
					</li>
				{:else}
					<li class="px-4 py-6 text-center text-slate-400">Belum ada tagihan.</li>
				{/each}
			</ul>
		</section>

		<section class={kelasKartu}>
			<h2 class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">Riwayat Retur</h2>
			<ul class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
				{#each data.retur as r}
					<li class="px-4 py-3">
						<div class="flex justify-between gap-3"><span class="font-bold">{r.nomor}</span><span class="text-xs text-slate-500 whitespace-nowrap">{tgl(r.tanggal)}</span></div>
						<p class="text-xs text-slate-500 mt-1">{r.ringkasan}</p>
						<p class="text-xs text-slate-400 mt-0.5">{r.alasan}{Number(r.nilaiPotongHutang) > 0 ? ` · potong hutang ${rp(r.nilaiPotongHutang)}` : ''}</p>
					</li>
				{:else}
					<li class="px-4 py-6 text-center text-slate-400">Belum ada retur.</li>
				{/each}
			</ul>
		</section>
	</div>
</PageLayout>

{#if bayarUntuk}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" role="dialog" aria-modal="true" aria-labelledby="judulBayar">
		<form method="POST" action="?/bayar" use:enhance={kirimForm()} class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
			<h2 id="judulBayar" class="font-bold text-slate-800 dark:text-slate-100">Bayar Faktur {bayarUntuk.nomorFaktur}</h2>
			<p class="text-sm text-slate-500">Sisa tagihan <span class="font-mono font-bold text-slate-800 dark:text-slate-100">{rp(bayarUntuk.sisa)}</span></p>
			<input type="hidden" name="payableId" value={bayarUntuk.payableId} />
			<div>
				<label for="nominalBayar" class={kelasLabel}>Nominal</label>
				<input id="nominalBayar" type="number" name="nominal" min="1" max={bayarUntuk.sisa} step="any" value={bayarUntuk.sisa} required class={kelasInput} />
			</div>
			<div>
				<label for="kasCoaId" class={kelasLabel}>Dibayar dari</label>
				<select id="kasCoaId" name="kasCoaId" required class={kelasInput}>
					<option value="">Pilih akun kas/bank</option>
					{#each data.akunKas as a}
						<option value={a.id}>{a.kodeAkun} · {a.namaAkun}</option>
					{/each}
				</select>
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class={kelasAksi} on:click={() => (bayarUntuk = null)}>Batal</button>
				<button class={kelasUtama} disabled={sedangKirim}>{sedangKirim ? 'Menyimpan...' : 'Simpan Pembayaran'}</button>
			</div>
		</form>
	</div>
{/if}
