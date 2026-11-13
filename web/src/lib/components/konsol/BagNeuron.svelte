<script>
	import Area from './Area.svelte';
	import Cincin from './Cincin.svelte';
	import JamAI from './JamAI.svelte';
	import Angka from './Angka.svelte';
	import Satelit from './Satelit.svelte';
	import { kontrol } from './api.js';
	import { singkat, angka, relatif, PALET, WARNA } from './util.js';

	/** @type {{ data: any, denyut?: any, beritahu: (pesan: string, jenis?: string) => void, muatUlang: () => void, bolehKontrol?: boolean }} */
	let { data, denyut = null, beritahu, muatUlang, bolehKontrol = true } = $props();
	const t = $derived(data.total);
	const gagalPct = $derived(t.permintaan30 ? (t.gagal30 / t.permintaan30) * 100 : 0);
	let sibuk = $state('');
	/** @type {Record<number, string>} */
	let ubahKuota = $state({});

	/** @param {string} nama @param {Record<string, unknown>} body */
	async function jalankan(nama, body) {
		if (!bolehKontrol) return;
		sibuk = nama;
		try {
			const r = await kontrol(body);
			beritahu(r.pesan || 'Selesai', 'ok');
			muatUlang();
		} catch (e) {
			beritahu(e instanceof Error ? e.message : 'Gagal', 'galat');
		} finally {
			sibuk = '';
		}
	}
	/** @param {any} p */
	function simpanKuota(p) {
		const v = String(ubahKuota[p.id] ?? '').trim();
		jalankan(`kuota-${p.id}`, { aksi: 'kuota', userId: p.id, batas: v === '' ? null : Number(v) });
		delete ubahKuota[p.id];
	}
	const modelVisi = $derived(new Set(denyut?.ai?.kandidatVisi || []));
</script>

<div class="bacaan-baris">
	{#each [
		{ l: 'Token hari ini', v: t.tokenHari, s: `${angka(t.permintaanHari)} permintaan`, w: WARNA.amber },
		{ l: 'Token 7 hari', v: t.token7, s: `${angka(t.permintaan7)} permintaan`, w: WARNA.aqua },
		{ l: 'Token 30 hari', v: t.token30, s: `prompt ${singkat(t.prompt30)} · jawaban ${singkat(t.completion30)}`, w: WARNA.ungu },
		{ l: 'Tingkat gagal', v: gagalPct, s: `${angka(t.gagal30)} dari ${angka(t.permintaan30)} (30 hr)`, w: gagalPct > 5 ? WARNA.mawar : WARNA.hijau, pct: true },
		{ l: 'Latensi p50 · p95', v: data.latensi.p50, s: data.latensi.p95 != null ? `p95 ${angka(data.latensi.p95)} ms · ${data.latensi.sampel} sampel` : 'belum ada data', w: WARNA.biru, ms: true }
	] as b, i (b.l)}
		<div class="bacaan" style={`--aksen:${b.w}; animation-delay:${i * 60}ms`}>
			<span class="lbl">{b.l}</span>
			<b class="nilai"><Angka nilai={b.v} format={b.pct ? (/** @type {number} */ n) => n.toFixed(1) + '%' : b.ms ? (/** @type {number} */ n) => Math.round(n) + ' ms' : singkat} /></b>
			<span class="sub">{b.s}</span>
		</div>
	{/each}
</div>

<section class="panel">
	<header class="judul-panel">
		<span>Arus Token per Fitur · 30 Hari</span>
		<small>dicatat otomatis dari setiap panggilan model</small>
	</header>
	{#if data.jenis.length}
		<Area
			label={data.harian.map((/** @type {any} */ h) => h.tanggal.slice(8, 10) + '/' + h.tanggal.slice(5, 7))}
			seri={data.jenis.map((/** @type {string} */ j, /** @type {number} */ i) => ({ nama: j, warna: PALET[i % PALET.length], nilai: data.harian.map((/** @type {any} */ h) => h.per[j] || 0) }))}
			tinggi={240}
		/>
	{:else}
		<Satelit teks="Belum ada pemakaian AI tercatat. Data mulai terkumpul sejak fitur ini dipasang." />
	{/if}
</section>

<div class="kisi-3">
	<section class="panel">
		<header class="judul-panel"><span>Komposisi Model</span><small>token 30 hari</small></header>
		{#if data.model.length}
			<Cincin data={data.model.slice(0, 6).map((/** @type {any} */ m, /** @type {number} */ i) => ({ nama: m.model, nilai: m.token, warna: PALET[i % PALET.length] }))} judul={singkat(t.token30)} sub="token" />
		{:else}
			<Satelit kecil teks="Belum ada data" />
		{/if}
	</section>
	<section class="panel">
		<header class="judul-panel"><span>Jam AI</span><small>sebaran permintaan per jam · 7 hari</small></header>
		<JamAI data={data.jam} />
	</section>
	<section class="panel">
		<header class="judul-panel"><span>Panel Kendali AI</span><small>{bolehKontrol ? 'tindakan tercatat di Jejak' : 'peran pengamat: hanya melihat'}</small></header>
		<div class="tombol-daftar" class:terkunci={!bolehKontrol}>
			<button class="tombol" disabled={!!sibuk} onclick={() => jalankan('uji', { aksi: 'uji-ai' })}>
				<span class="titik-tombol" class:putar={sibuk === 'uji'}></span>Uji koneksi AI
			</button>
			<button class="tombol" disabled={!!sibuk} onclick={() => jalankan('model', { aksi: 'segarkan-model' })}>
				<span class="titik-tombol" class:putar={sibuk === 'model'}></span>Segarkan daftar model
			</button>
			<button class="tombol" disabled={!!sibuk} onclick={() => jalankan('visi', { aksi: 'lupakan-visi' })}>
				<span class="titik-tombol" class:putar={sibuk === 'visi'}></span>Deteksi ulang model visi
			</button>
		</div>
		<p class="catatan">
			Batas bawaan: {data.batas.perMenit}/menit · {data.batas.perHari}/hari per pengguna.
			{#if denyut?.ai}
				<br />Foto nota: {denyut.ai.visiDiingat || (denyut.ai.kandidatVisi.length ? 'model visi tersedia' : 'tidak ada model visi → OCR di perangkat')}
			{/if}
		</p>
		{#if denyut?.ai?.model?.length}
			<div class="model-daftar">
				{#each denyut.ai.model as m (m)}
					<span class="chip" class:visi={modelVisi.has(m)}>{m}</span>
				{/each}
			</div>
		{/if}
	</section>
</div>

<section class="panel">
	<header class="judul-panel"><span>Pemakai AI Teratas · 30 Hari</span><small>atur kuota harian per pengguna (kosongkan = bawaan)</small></header>
	{#if data.pengguna.length}
		<div class="tabel-gulir">
			<table>
				<thead>
					<tr><th>Pengguna</th><th>Token</th><th>Permintaan</th><th>Gagal</th><th>Terakhir</th><th>Kuota 24 jam</th><th></th></tr>
				</thead>
				<tbody>
					{#each data.pengguna as p (p.id)}
						{@const pakai = p.terpakaiHari ?? 0}
						{@const pct = Math.min(100, (pakai / p.kuotaHari) * 100)}
						<tr>
							<td><b>{p.nama}</b><small>{p.email}</small></td>
							<td class="mono">{singkat(p.token)}</td>
							<td class="mono">{angka(p.n)}</td>
							<td class="mono" class:merah={p.gagal > 0}>{angka(p.gagal)}</td>
							<td class="redup">{relatif(p.akhir)}</td>
							<td>
								<div class="kuota">
									<div class="bar"><span style={`width:${pct}%; background:${pct > 90 ? '#ff6b8a' : pct > 70 ? '#ffc65c' : '#3ef0d0'}`}></span></div>
									<small class="mono">{p.terpakaiHari == null ? '–' : pakai}/{p.kuotaHari}</small>
								</div>
							</td>
							<td class="aksi">
								<input type="number" min="1" placeholder={String(p.kuotaHari)} bind:value={ubahKuota[p.id]} disabled={!data.redis || !bolehKontrol} aria-label={`Kuota harian ${p.nama}`} />
								<button class="mini" disabled={!data.redis || !!sibuk || !bolehKontrol} onclick={() => simpanKuota(p)}>Simpan</button>
								<button class="mini hantu" disabled={!data.redis || !!sibuk || !bolehKontrol} onclick={() => jalankan(`reset-${p.id}`, { aksi: 'reset-kuota', userId: p.id })}>Nolkan</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if !data.redis}<p class="catatan">Redis tidak aktif di lingkungan ini, jadi kuota khusus tidak bisa disimpan.</p>{/if}
	{:else}
		<Satelit kecil teks="Belum ada pengguna yang memakai AI sejak pencatatan dimulai." />
	{/if}
</section>

<style>
	.bacaan-baris {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 18px;
	}
	.bacaan {
		position: relative;
		padding: 14px;
		border-radius: 14px;
		background: var(--kartu-bg);
		border: 1px solid rgb(var(--kisi-rgb) / 0.12);
		display: grid;
		gap: 4px;
		overflow: hidden;
		animation: naik 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) both;
	}
	.bacaan::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--aksen), transparent);
	}
	.lbl {
		font-size: 10.5px;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: var(--redup);
	}
	.nilai {
		font: 700 24px/1.1 var(--f-mono, monospace);
		color: var(--kuat);
	}
	.sub {
		font-size: 11px;
		color: var(--teks-2);
	}
	.kisi-3 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
		margin-bottom: 18px;
	}
	.tombol-daftar {
		display: grid;
		gap: 8px;
	}
	.tombol {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid rgb(var(--aksen-rgb) / 0.3);
		background: linear-gradient(90deg, rgb(var(--aksen-rgb) / 0.08), rgb(var(--ungu-rgb) / 0.06));
		color: var(--teks);
		font: 600 13px var(--f-tampil, sans-serif);
		cursor: pointer;
		text-align: left;
		transition:
			transform 0.15s,
			border-color 0.15s;
	}
	.tombol:hover:not(:disabled) {
		transform: translateX(3px);
		border-color: var(--aksen);
	}
	.tombol:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	.terkunci {
		pointer-events: none;
		opacity: 0.45;
		filter: grayscale(0.6);
	}
	.titik-tombol {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--aksen);
	}
	.titik-tombol.putar {
		border-right-color: transparent;
		animation: putar 0.7s linear infinite;
	}
	.catatan {
		font-size: 11.5px;
		color: var(--redup);
		margin: 12px 0 0;
		line-height: 1.5;
	}
	.model-daftar {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 10px;
	}
	.chip {
		font: 10.5px var(--f-mono, monospace);
		padding: 2px 8px;
		border-radius: 99px;
		background: rgb(var(--kisi-rgb) / 0.08);
		color: var(--teks-2);
	}
	.chip.visi {
		background: rgb(var(--amber-rgb) / 0.16);
		color: var(--amber);
	}
	.tabel-gulir {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
		min-width: 760px;
	}
	th {
		text-align: left;
		font-size: 10.5px;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--redup-2);
		font-weight: 600;
		padding: 6px 8px;
		border-bottom: 1px solid rgb(var(--kisi-rgb) / 0.12);
	}
	td {
		padding: 9px 8px;
		border-bottom: 1px solid rgb(var(--kisi-rgb) / 0.06);
		vertical-align: middle;
	}
	td b {
		display: block;
		color: var(--kuat);
	}
	td small {
		color: var(--redup-2);
		font-size: 11px;
	}
	tr:hover td {
		background: rgb(var(--aksen-rgb) / 0.03);
	}
	.mono {
		font-family: var(--f-mono, monospace);
	}
	.merah {
		color: var(--mawar);
	}
	.redup {
		color: var(--redup);
	}
	.kuota {
		display: grid;
		gap: 3px;
		min-width: 110px;
	}
	.bar {
		height: 6px;
		border-radius: 99px;
		background: rgb(var(--kisi-rgb) / 0.1);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		border-radius: 99px;
		transition: width 0.8s;
	}
	.aksi {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.aksi input {
		width: 74px;
		padding: 5px 8px;
		border-radius: 8px;
		border: 1px solid rgb(var(--kisi-rgb) / 0.2);
		background: var(--kolom-bg);
		color: var(--kuat);
		font: 12px var(--f-mono, monospace);
	}
	.mini {
		padding: 5px 10px;
		border-radius: 8px;
		border: 0;
		background: var(--aksen);
		color: #05070f;
		font: 600 11.5px var(--f-tampil, sans-serif);
		cursor: pointer;
	}
	.mini.hantu {
		background: transparent;
		color: var(--teks-2);
		border: 1px solid rgb(var(--kisi-rgb) / 0.25);
	}
	.mini:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	@keyframes naik {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 1100px) {
		.bacaan-baris {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.kisi-3 {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 680px) {
		.bacaan-baris {
			grid-template-columns: 1fr 1fr;
		}
		.kisi-3 {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bacaan,
		.titik-tombol.putar {
			animation: none;
		}
	}
</style>
