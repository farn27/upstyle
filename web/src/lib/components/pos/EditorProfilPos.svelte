<script>
	/**
	 * Editor profil kasir: pilih jenis usaha, susun dengan AI, atur meja, dapur, antrean, biaya, dan isian khas.
	 * Perubahan berupa draf sampai tombol "Simpan kasir" ditekan.
	 */
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		PROFIL_POS,
		DAFTAR_PROFIL,
		JENIS_PESANAN,
		LABEL_JENIS_PESANAN,
		pengaturanBawaan,
		normalisasiPengaturan,
		hitungBiayaTambahan,
		buatDaftarMeja,
		kunciDari
	} from '$lib/posProfil';

	/** @type {{ profilPos: any, kategoriProduk: string[], usulan?: any, pesan?: string, galat?: string }} */
	let { profilPos, kategoriProduk, usulan = null, pesan = '', galat = '' } = $props();

	const salin = (/** @type {any} */ o) => JSON.parse(JSON.stringify(o));
	/** @type {string | null} */
	let profil = $state(profilPos?.profil ?? null);
	/** @type {any} */
	let p = $state(profilPos ? salin(profilPos.pengaturan) : null);
	let draf = $state(false);
	let dariAi = $state(false);
	let deskripsi = $state('');
	let sibukAi = $state(false);
	let sibukSimpan = $state(false);
	let jumlahMejaBaru = $state(10);
	let areaBaru = $state('Dalam');
	let galeriTerbuka = $state(!profilPos);
	let contoh = $state(100000);

	// Usulan AI dari aksi form → masuk editor sebagai draf
	let usulanTerakhir = /** @type {any} */ (null);
	$effect(() => {
		if (usulan && usulan !== usulanTerakhir) {
			usulanTerakhir = usulan;
			profil = usulan.profil;
			p = salin(usulan.pengaturan);
			draf = true;
			dariAi = usulan.sumber === 'ai';
			galeriTerbuka = false;
		}
	});

	const info = $derived(profil ? PROFIL_POS[profil] : null);
	const area = $derived(p ? [...new Set(p.meja.daftar.map((/** @type {any} */ m) => m.area))] : []);
	const biaya = $derived(p ? hitungBiayaTambahan(contoh, p, 'DINE_IN') : null);
	const rp = (/** @type {number} */ n) => 'Rp' + Math.round(n).toLocaleString('id-ID');

	function ubah() {
		draf = true;
	}
	function pilihProfil(/** @type {string} */ id) {
		if (draf && !confirm('Perubahan yang belum disimpan akan diganti. Lanjut?')) return;
		profil = id;
		p = pengaturanBawaan(id);
		draf = true;
		dariAi = false;
		galeriTerbuka = false;
	}
	function batal() {
		profil = profilPos?.profil ?? null;
		p = profilPos ? salin(profilPos.pengaturan) : null;
		draf = false;
		dariAi = false;
	}
	function aturJenis(/** @type {string} */ j) {
		const ada = p.jenisPesanan.includes(j);
		if (ada && p.jenisPesanan.length === 1) return;
		p.jenisPesanan = ada ? p.jenisPesanan.filter((/** @type {string} */ x) => x !== j) : JENIS_PESANAN.filter((x) => x === j || p.jenisPesanan.includes(x));
		ubah();
	}
	function tambahMeja() {
		const n = Math.max(1, Math.min(100, Math.round(Number(jumlahMejaBaru) || 0)));
		const nomorTerbesar = Math.max(0, ...p.meja.daftar.map((/** @type {any} */ m) => Number(m.kode) || 0));
		const baru = buatDaftarMeja(n, [areaBaru.trim() || 'Utama']).map((m, i) => ({ ...m, kode: String(nomorTerbesar + i + 1) }));
		p.meja.daftar = [...p.meja.daftar, ...baru].slice(0, 300);
		p.meja.aktif = true;
		if (!p.jenisPesanan.includes('DINE_IN')) p.jenisPesanan = ['DINE_IN', ...p.jenisPesanan];
		ubah();
	}
	function hapusMeja(/** @type {string} */ kode) {
		p.meja.daftar = p.meja.daftar.filter((/** @type {any} */ m) => m.kode !== kode);
		ubah();
	}
	function hapusArea(/** @type {string} */ a) {
		p.meja.daftar = p.meja.daftar.filter((/** @type {any} */ m) => m.area !== a);
		ubah();
	}
	function tambahStasiun() {
		p.dapur.stasiun = [...p.dapur.stasiun, { kode: '', nama: `Stasiun ${p.dapur.stasiun.length + 1}`, kategori: [] }].slice(0, 8);
		p.dapur.aktif = true;
		ubah();
	}
	function aturKategori(/** @type {any} */ st, /** @type {string} */ k) {
		st.kategori = st.kategori.includes(k) ? st.kategori.filter((/** @type {string} */ x) => x !== k) : [...st.kategori, k];
		ubah();
	}
	function tambahIsian() {
		p.isian = [...p.isian, { kunci: '', label: '', tipe: 'teks', wajib: false }].slice(0, 8);
		ubah();
	}
	const dataKirim = $derived(p && profil ? JSON.stringify(normalisasiPengaturan({ ...p, isian: p.isian.map((/** @type {any} */ f) => ({ ...f, kunci: f.kunci || kunciDari(f.label) })) }, profil)) : '');
</script>

<section class="space-y-5" aria-labelledby="judul-profil">
	<!-- Kepala: kasir saat ini -->
	<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex flex-wrap items-start gap-4">
		<div class="text-4xl leading-none select-none" aria-hidden="true">{info?.ikon ?? '🏪'}</div>
		<div class="flex-1 min-w-[200px]">
			<p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">Kasir unit ini</p>
			<h2 id="judul-profil" class="text-xl font-black text-slate-900 dark:text-white">
				{info ? info.label : 'Kasir standar'}
				{#if draf}<span class="ml-2 align-middle px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">BELUM DISIMPAN</span>{/if}
				{#if dariAi}<span class="ml-1 align-middle px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">USULAN AI</span>{/if}
				{#if !draf && profilPos?.sumber === 'ai'}<span class="ml-2 align-middle px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">DISUSUN AI</span>{/if}
				{#if !draf && profilPos?.sumber === 'aturan'}<span class="ml-2 align-middle px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">OTOMATIS</span>{/if}
			</h2>
			<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
				{info ? info.ringkas : 'Unit ini memakai kasir standar. Pilih jenis usaha atau ceritakan usahamu agar kasir menyesuaikan (meja, dapur, antrean, data khas pesanan).'}
			</p>
		</div>
		<button type="button" class="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700" onclick={() => (galeriTerbuka = !galeriTerbuka)} aria-expanded={galeriTerbuka}>
			{galeriTerbuka ? 'Tutup pilihan' : 'Ganti jenis usaha'}
		</button>
	</div>

	{#if pesan}<p class="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-2.5" role="status">{pesan}</p>{/if}
	{#if galat}<p class="rounded-xl bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-4 py-2.5" role="alert">{galat}</p>{/if}

	<!-- Susun dengan AI -->
	<form
		method="POST"
		action="?/susunAi"
		class="rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/40 dark:to-slate-800 p-5"
		use:enhance={() => {
			sibukAi = true;
			return async ({ update }) => {
				await update({ reset: false, invalidateAll: false });
				sibukAi = false;
			};
		}}
	>
		<label for="uraian-usaha" class="block text-sm font-black text-violet-900 dark:text-violet-200">✨ Ceritakan usahamu, AI menyusun kasirnya</label>
		<p class="text-xs text-violet-700/80 dark:text-violet-300/80 mt-0.5 mb-3">Hasilnya ditampilkan dulu untuk kamu tinjau — tidak langsung mengubah kasir.</p>
		<textarea id="uraian-usaha" name="deskripsi" bind:value={deskripsi} rows="3" maxlength="600"
			placeholder="Contoh: Warung bakso 12 meja di dalam dan 4 di teras. Mie & bakso disiapkan di dapur, es teh & jus di meja minuman. Pembeli biasanya bayar setelah makan."
			class="w-full rounded-xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-900 p-3 text-sm outline-none focus:border-violet-500 resize-none"></textarea>
		<div class="mt-2 flex justify-end">
			<button type="submit" disabled={sibukAi || deskripsi.trim().length < 8} class="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-violet-700">
				{sibukAi ? 'Menyusun…' : 'Susun dengan AI'}
			</button>
		</div>
	</form>

	<!-- Galeri profil -->
	{#if galeriTerbuka}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
			{#each DAFTAR_PROFIL as id (id)}
				{@const x = PROFIL_POS[id]}
				<button type="button" role="listitem" onclick={() => pilihProfil(id)}
					class="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md {profil === id ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}">
					<span class="text-2xl" aria-hidden="true">{x.ikon}</span>
					<span class="block mt-1 font-black text-sm text-slate-900 dark:text-white">{x.label}</span>
					<span class="block mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{x.ringkas}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if p && profil}
		<!-- Jenis pesanan -->
		<fieldset class="kartu">
			<legend class="judul">Jenis pesanan</legend>
			<div class="flex flex-wrap gap-2">
				{#each JENIS_PESANAN as j (j)}
					<button type="button" class="chip {p.jenisPesanan.includes(j) ? 'chip-aktif' : ''}" aria-pressed={p.jenisPesanan.includes(j)} onclick={() => aturJenis(j)}>{LABEL_JENIS_PESANAN[j]}</button>
				{/each}
			</div>
		</fieldset>

		<!-- Meja -->
		<fieldset class="kartu">
			<legend class="judul">Meja & denah</legend>
			<label class="saklar"><input type="checkbox" bind:checked={p.meja.aktif} onchange={ubah} disabled={!p.meja.daftar.length} /> <span>Pakai nomor meja</span></label>
			{#each area as a (a)}
				<div class="mt-3">
					<div class="flex items-center justify-between">
						<p class="text-xs font-bold text-slate-500">{a} · {p.meja.daftar.filter((/** @type {any} */ m) => m.area === a).length} meja</p>
						<button type="button" class="text-[11px] text-red-500 font-bold" onclick={() => hapusArea(a)}>Hapus area</button>
					</div>
					<div class="flex flex-wrap gap-1.5 mt-1.5">
						{#each p.meja.daftar.filter((/** @type {any} */ m) => m.area === a) as m (m.kode)}
							<span class="meja">{m.kode}<button type="button" aria-label={`Hapus meja ${m.kode}`} onclick={() => hapusMeja(m.kode)}>×</button></span>
						{/each}
					</div>
				</div>
			{/each}
			<div class="mt-3 flex flex-wrap items-end gap-2">
				<label class="text-xs text-slate-500">Tambah
					<input type="number" min="1" max="100" bind:value={jumlahMejaBaru} class="isian w-20 block mt-1" /></label>
				<label class="text-xs text-slate-500">meja di area
					<input type="text" maxlength="30" bind:value={areaBaru} class="isian w-36 block mt-1" /></label>
				<button type="button" class="tombol-kecil" onclick={tambahMeja}>+ Tambah</button>
			</div>
		</fieldset>

		<!-- Open bill -->
		<fieldset class="kartu">
			<legend class="judul">Pesan dulu, bayar nanti (open bill)</legend>
			<label class="saklar"><input type="checkbox" bind:checked={p.openBill} onchange={ubah} /> <span>Simpan pesanan ke {p.labelBill.toLowerCase()} lalu bayar belakangan, bisa tambah pesanan</span></label>
			{#if p.openBill}
				<label class="block mt-2 text-xs text-slate-500">Sebutan bill
					<input type="text" maxlength="20" bind:value={p.labelBill} oninput={ubah} class="isian w-40 block mt-1" placeholder="Meja / Kendaraan / Bill" /></label>
			{/if}
		</fieldset>

		<!-- Dapur -->
		<fieldset class="kartu">
			<legend class="judul">Dapur, bar & tiket pesanan</legend>
			<label class="saklar"><input type="checkbox" bind:checked={p.dapur.aktif} onchange={ubah} disabled={!p.dapur.stasiun.length} /> <span>Kirim tiket pesanan ke layar dapur</span></label>
			<div class="mt-3 space-y-3">
				{#each p.dapur.stasiun as st, i (i)}
					<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
						<div class="flex gap-2 items-center">
							<input type="text" maxlength="30" bind:value={st.nama} oninput={ubah} class="isian flex-1" aria-label="Nama stasiun" />
							<button type="button" class="text-xs text-red-500 font-bold" onclick={() => { p.dapur.stasiun = p.dapur.stasiun.filter((/** @type {any} */ _x, /** @type {number} */ j) => j !== i); ubah(); }}>Hapus</button>
						</div>
						<p class="text-[11px] text-slate-500 mt-2">{st.kategori.length ? 'Menyiapkan kategori:' : 'Menyiapkan semua menu yang tidak masuk stasiun lain. Pilih kategori bila perlu:'}</p>
						<div class="flex flex-wrap gap-1.5 mt-1">
							{#each [...new Set([...kategoriProduk, ...st.kategori])] as k (k)}
								<button type="button" class="chip kecil {st.kategori.includes(k) ? 'chip-aktif' : ''}" aria-pressed={st.kategori.includes(k)} onclick={() => aturKategori(st, k)}>{k}</button>
							{:else}
								<span class="text-[11px] text-slate-400">Belum ada kategori produk.</span>
							{/each}
						</div>
					</div>
				{/each}
				{#if p.dapur.stasiun.length < 8}<button type="button" class="tombol-kecil" onclick={tambahStasiun}>+ Tambah stasiun</button>{/if}
			</div>
		</fieldset>

		<!-- Antrean & catatan -->
		<fieldset class="kartu">
			<legend class="judul">Antrean & catatan</legend>
			<label class="saklar"><input type="checkbox" bind:checked={p.nomorAntrean} onchange={ubah} /> <span>Nomor antrean otomatis (A1, A2, … reset tiap hari)</span></label>
			<label class="saklar mt-2"><input type="checkbox" bind:checked={p.catatanItem} onchange={ubah} /> <span>Catatan per item (mis. "tidak pedas", "less sugar")</span></label>
		</fieldset>

		<!-- Biaya -->
		<fieldset class="kartu">
			<legend class="judul">Service charge & pajak restoran</legend>
			<div class="grid sm:grid-cols-2 gap-4">
				<div>
					<label class="text-xs text-slate-500">Service charge (%)
						<input type="number" min="0" max="30" step="0.5" bind:value={p.servis.persen} oninput={ubah} class="isian w-28 block mt-1" /></label>
					<label class="saklar mt-2"><input type="checkbox" bind:checked={p.servis.hanyaDineIn} onchange={ubah} /> <span>Hanya untuk makan di tempat</span></label>
				</div>
				<div>
					<label class="saklar"><input type="checkbox" bind:checked={p.pajakResto.aktif} onchange={ubah} /> <span>Pungut pajak restoran (PB1)</span></label>
					{#if p.pajakResto.aktif}
						<label class="block text-xs text-slate-500 mt-2">Tarif (%)
							<input type="number" min="0" max="15" step="0.5" bind:value={p.pajakResto.persen} oninput={ubah} class="isian w-28 block mt-1" /></label>
						<label class="saklar mt-2"><input type="checkbox" bind:checked={p.pajakResto.inklusif} onchange={ubah} /> <span>Harga menu sudah termasuk pajak</span></label>
					{/if}
				</div>
			</div>
			{#if biaya && (biaya.servis > 0 || biaya.pajak > 0)}
				<div class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-sm">
					<p class="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Contoh struk makan di tempat</p>
					<div class="flex justify-between"><span>Pesanan</span><span>{rp(contoh)}</span></div>
					{#if biaya.servis}<div class="flex justify-between"><span>Service {biaya.servisPersen}%</span><span>{rp(biaya.servis)}</span></div>{/if}
					{#if biaya.pajak}<div class="flex justify-between"><span>PB1 {biaya.pajakPersen}%{biaya.pajakInklusif ? ' (termasuk)' : ''}</span><span>{rp(biaya.pajak)}</span></div>{/if}
					<div class="flex justify-between font-black border-t border-slate-200 dark:border-slate-700 mt-1 pt-1"><span>Total</span><span>{rp(biaya.total)}</span></div>
				</div>
				<p class="text-[11px] text-slate-500 mt-2">Tercatat otomatis di jurnal: service ke "Pendapatan Service Charge", PB1 ke "Utang Pajak Restoran (PB1)". PB1 tidak dikenakan bersamaan dengan PPN.</p>
			{/if}
		</fieldset>

		<!-- Isian khas -->
		<fieldset class="kartu">
			<legend class="judul">Data khas pesanan</legend>
			<p class="text-xs text-slate-500 mb-2">Kolom tambahan yang diisi kasir per transaksi — misalnya plat nomor, tanggal ambil, nama pasien. Tercatat di catatan order.</p>
			<div class="space-y-2">
				{#each p.isian as f, i (i)}
					<div class="flex flex-wrap gap-2 items-center">
						<input type="text" maxlength="30" bind:value={f.label} oninput={ubah} class="isian flex-1 min-w-[140px]" placeholder="Nama kolom" aria-label="Nama kolom" />
						<select bind:value={f.tipe} onchange={ubah} class="isian w-28" aria-label="Jenis isian">
							<option value="teks">Teks</option><option value="angka">Angka</option><option value="tanggal">Tanggal</option>
						</select>
						<label class="saklar"><input type="checkbox" bind:checked={f.wajib} onchange={ubah} /> <span>Wajib</span></label>
						<button type="button" class="text-xs text-red-500 font-bold" onclick={() => { p.isian = p.isian.filter((/** @type {any} */ _x, /** @type {number} */ j) => j !== i); ubah(); }}>Hapus</button>
					</div>
				{/each}
			</div>
			{#if p.isian.length < 8}<button type="button" class="tombol-kecil mt-2" onclick={tambahIsian}>+ Tambah kolom</button>{/if}
		</fieldset>

		<!-- Istilah -->
		<fieldset class="kartu">
			<legend class="judul">Istilah di layar kasir</legend>
			<div class="flex flex-wrap gap-4">
				<label class="text-xs text-slate-500">Sebutan barang
					<input type="text" maxlength="20" bind:value={p.istilah.produk} oninput={ubah} class="isian w-44 block mt-1" /></label>
				<label class="text-xs text-slate-500">Sebutan pembeli
					<input type="text" maxlength="20" bind:value={p.istilah.pelanggan} oninput={ubah} class="isian w-44 block mt-1" /></label>
			</div>
		</fieldset>

		<!-- Bilah simpan -->
		<form
			method="POST"
			action="?/simpanProfil"
			class="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur p-3 shadow-lg"
			use:enhance={() => {
				sibukSimpan = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') {
						draf = false;
						dariAi = false;
						await invalidateAll();
					}
					sibukSimpan = false;
				};
			}}
		>
			<input type="hidden" name="profil" value={profil} />
			<input type="hidden" name="pengaturan" value={dataKirim} />
			<span class="text-xs text-slate-500">{draf ? 'Ada perubahan yang belum disimpan.' : 'Semua pengaturan tersimpan.'}</span>
			<div class="flex gap-2">
				{#if draf}<button type="button" class="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" onclick={batal}>Batal</button>{/if}
				<button type="submit" disabled={!draf || sibukSimpan} class="px-6 py-2.5 rounded-xl text-sm font-black bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700">{sibukSimpan ? 'Menyimpan…' : 'Simpan kasir'}</button>
			</div>
		</form>

		{#if profilPos}
			<form method="POST" action="?/hapusProfil" use:enhance={() => async ({ update }) => { await update(); batal(); }} onsubmit={(/** @type {SubmitEvent} */ e) => { if (!confirm('Kembalikan ke kasir standar? Meja, dapur, dan isian khas tidak dipakai lagi.')) e.preventDefault(); }}>
				<button type="submit" class="text-xs font-bold text-red-500 underline">Kembali ke kasir standar</button>
			</form>
		{/if}
	{/if}
</section>

<style>
	.kartu {
		border: 1px solid rgb(226 232 240);
		border-radius: 1rem;
		padding: 1rem 1.25rem 1.25rem;
		background: #fff;
	}
	:global(.dark) .kartu {
		border-color: rgb(51 65 85);
		background: rgb(30 41 59);
	}
	.judul {
		padding: 0 0.4rem;
		margin-left: -0.4rem;
		font-size: 0.875rem;
		font-weight: 900;
		color: rgb(15 23 42);
	}
	:global(.dark) .judul {
		color: #fff;
	}
	.chip {
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		border: 1px solid rgb(203 213 225);
		font-size: 0.8rem;
		font-weight: 700;
		color: rgb(71 85 105);
		background: transparent;
	}
	.chip.kecil {
		padding: 0.2rem 0.6rem;
		font-size: 0.7rem;
	}
	.chip-aktif {
		background: rgb(37 99 235);
		border-color: rgb(37 99 235);
		color: #fff;
	}
	:global(.dark) .chip:not(.chip-aktif) {
		color: rgb(203 213 225);
		border-color: rgb(71 85 105);
	}
	.saklar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: rgb(51 65 85);
	}
	:global(.dark) .saklar {
		color: rgb(226 232 240);
	}
	.saklar input {
		width: 1rem;
		height: 1rem;
		accent-color: rgb(37 99 235);
	}
	.isian {
		border: 1px solid rgb(203 213 225);
		border-radius: 0.6rem;
		padding: 0.45rem 0.65rem;
		font-size: 0.85rem;
		background: #fff;
		color: rgb(15 23 42);
	}
	:global(.dark) .isian {
		background: rgb(15 23 42);
		border-color: rgb(71 85 105);
		color: #fff;
	}
	.meja {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.2rem 0.3rem 0.2rem 0.6rem;
		border-radius: 0.5rem;
		background: rgb(241 245 249);
		font-size: 0.75rem;
		font-weight: 800;
		color: rgb(30 41 59);
	}
	:global(.dark) .meja {
		background: rgb(51 65 85);
		color: #fff;
	}
	.meja button {
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 0.3rem;
		color: rgb(148 163 184);
		line-height: 1;
	}
	.meja button:hover {
		color: rgb(239 68 68);
	}
	.tombol-kecil {
		padding: 0.45rem 0.9rem;
		border-radius: 0.6rem;
		border: 1px dashed rgb(148 163 184);
		font-size: 0.8rem;
		font-weight: 700;
		color: rgb(37 99 235);
	}
</style>
