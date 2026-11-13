<script>
	/** Data penelitian: kueri Lembar G (L1–L3, U1–U5) per unit & periode, lengkap dengan unduhan CSV. */
	import { onMount } from 'svelte';
	import Satelit from './Satelit.svelte';
	import { ambil } from './api.js';
	import { keCSV, unduh } from './util.js';

	/** @type {{ beritahu: (pesan: string, jenis?: string) => void }} */
	let { beritahu } = $props();

	const tgl = (/** @type {number} */ n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
	/** @type {{ id: number, nama: string, pemilik: string }[]} */
	let units = $state([]);
	let unitId = $state(0);
	let mulai = $state(tgl(-30));
	let akhir = $state(tgl(1));
	let memuat = $state(false);
	/** @type {any} */
	let hasil = $state(null);
	/** @type {Record<string, boolean>} */
	let lihatSql = $state({});

	const KET = /** @type {Record<string, string>} */ ({
		L1: 'Tabel 4.11 · total pemasukan & pengeluaran',
		L2: 'Tabel 4.11 · penjualan POS',
		L3: 'Tabel 4.11 · stok akhir',
		U1: 'Tabel 4.15 · hari aktif & transaksi per bulan',
		U2: 'Tabel 4.15 · POS per bulan & metode bayar',
		U3: 'Tabel 4.15 · mutasi stok',
		U4: 'Tabel 4.15 · aktivitas per fitur',
		U5: 'Tabel 4.15 · pemisahan unit usaha'
	});

	onMount(async () => {
		try {
			units = await ambil('unit-daftar');
			if (units.length) unitId = units[0].id;
		} catch (e) {
			beritahu(e instanceof Error ? e.message : 'Gagal memuat unit', 'galat');
		}
	});

	/** @param {'30' | 'lalu' | 'ini'} p */
	function preset(p) {
		const kini = new Date(Date.now() + 7 * 3600e3);
		const y = kini.getUTCFullYear();
		const m = kini.getUTCMonth();
		const f = (/** @type {Date} */ d) => d.toISOString().slice(0, 10);
		if (p === '30') {
			mulai = tgl(-30);
			akhir = tgl(1);
		} else if (p === 'ini') {
			mulai = f(new Date(Date.UTC(y, m, 1)));
			akhir = tgl(1);
		} else {
			mulai = f(new Date(Date.UTC(y, m - 1, 1)));
			akhir = f(new Date(Date.UTC(y, m, 1)));
		}
	}

	async function jalankan() {
		if (!unitId) return;
		memuat = true;
		try {
			const r = await ambil(`riset?unit=${unitId}&mulai=${mulai}&akhir=${akhir}`);
			if (r.galat) throw new Error(r.galat);
			hasil = r;
		} catch (e) {
			beritahu(e instanceof Error ? e.message : 'Kueri gagal', 'galat');
		} finally {
			memuat = false;
		}
	}

	const nama = $derived(units.find((u) => u.id === unitId)?.nama || 'unit');
	const berkas = (/** @type {string} */ kode) => `${kode}_${nama.replace(/\W+/g, '-')}_${mulai}_${akhir}.csv`;

	function unduhSemua() {
		if (!hasil) return;
		const bagian = Object.entries(hasil.hasil).map(([k, v]) => {
			const x = /** @type {any} */ (v);
			return `# ${k} — ${x.judul}\n${x.baris.length ? keCSV(x.baris) : '(kosong)'}`;
		});
		unduh(`LembarG_${nama.replace(/\W+/g, '-')}_${mulai}_${akhir}.csv`, `# Unit: ${nama}\n# Periode: ${mulai} s.d. sebelum ${akhir}\n\n${bagian.join('\n\n')}`);
	}
</script>

<section class="panel kendali">
	<div class="isian">
		<label>
			<span>Unit bisnis</span>
			<select bind:value={unitId}>
				{#each units as u (u.id)}
					<option value={u.id}>{u.nama} — {u.pemilik}</option>
				{/each}
			</select>
		</label>
		<label><span>Mulai (≥)</span><input type="date" bind:value={mulai} /></label>
		<label><span>Akhir (&lt;)</span><input type="date" bind:value={akhir} /></label>
		<button class="jalan" onclick={jalankan} disabled={memuat || !unitId}>
			{#if memuat}<span class="muter"></span>Menjalankan…{:else}▶ Jalankan Lembar G{/if}
		</button>
	</div>
	<div class="preset">
		<span>Cepat:</span>
		<button onclick={() => preset('30')}>30 hari terakhir</button>
		<button onclick={() => preset('ini')}>Bulan ini</button>
		<button onclick={() => preset('lalu')}>Bulan lalu</button>
		{#if hasil}<button class="unduh" onclick={unduhSemua}>⬇ Unduh semua (CSV)</button>{/if}
	</div>
	<p class="catatan">Hanya membaca data (SELECT). Sesuai Lembar G: periode memakai batas WIB, mulai inklusif dan akhir eksklusif. Disarankan satu bulan penuh setelah masa adaptasi.</p>
</section>

{#if hasil}
	<div class="hasil">
		{#each Object.entries(hasil.hasil) as [kode, v], i (kode)}
			{@const x = /** @type {any} */ (v)}
			<section class="panel kartu" style={`animation-delay:${i * 60}ms`}>
				<header>
					<span class="kode">{kode}</span>
					<div>
						<b>{x.judul}</b>
						<small>{KET[kode] || ''} · {x.baris.length} baris</small>
					</div>
					<div class="aksi">
						<button onclick={() => (lihatSql[kode] = !lihatSql[kode])}>SQL</button>
						<button disabled={!x.baris.length} onclick={() => unduh(berkas(kode), keCSV(x.baris))}>CSV</button>
					</div>
				</header>
				{#if lihatSql[kode]}<pre>{x.sql}</pre>{/if}
				{#if x.galat}
					<p class="galat">⚠ {x.galat}</p>
				{:else if x.baris.length}
					<div class="gulir">
						<table>
							<thead><tr>{#each Object.keys(x.baris[0]) as k (k)}<th>{k}</th>{/each}</tr></thead>
							<tbody>
								{#each x.baris.slice(0, 200) as b, j (j)}
									<tr>{#each Object.values(b) as nilai, n (n)}<td>{nilai ?? '–'}</td>{/each}</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if x.baris.length > 200}<p class="catatan">Menampilkan 200 dari {x.baris.length} baris — unduh CSV untuk semuanya.</p>{/if}
				{:else}
					<p class="catatan">Tidak ada data pada periode ini.</p>
				{/if}
			</section>
		{/each}
	</div>
{:else if !memuat}
	<Satelit teks="Pilih unit & periode, lalu jalankan Lembar G." />
{/if}

<style>
	.isian {
		display: grid;
		grid-template-columns: minmax(200px, 2fr) repeat(2, minmax(140px, 1fr)) auto;
		gap: 12px;
		align-items: end;
	}
	label {
		display: grid;
		gap: 5px;
	}
	label span,
	.preset span {
		font-size: 10.5px;
		letter-spacing: 1.3px;
		text-transform: uppercase;
		color: var(--redup);
	}
	select,
	input {
		padding: 9px 11px;
		border-radius: 10px;
		border: 1px solid rgb(var(--kisi-rgb) / 0.2);
		background: var(--kolom-bg);
		color: var(--kuat);
		font: 13px var(--f-tampil, sans-serif);
		color-scheme: dark;
	}
	.jalan {
		padding: 10px 18px;
		border-radius: 10px;
		border: 0;
		background: linear-gradient(90deg, var(--aksen), var(--ungu));
		color: #05070f;
		font: 700 13px var(--f-tampil, sans-serif);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		box-shadow: 0 6px 22px rgb(var(--aksen-rgb) / 0.25);
	}
	.jalan:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.muter {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid #05070f;
		border-right-color: transparent;
		animation: putar 0.7s linear infinite;
	}
	.preset {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin-top: 12px;
	}
	.preset button,
	.aksi button {
		padding: 5px 11px;
		border-radius: 8px;
		border: 1px solid rgb(var(--kisi-rgb) / 0.22);
		background: none;
		color: var(--teks-2);
		font: 600 11.5px var(--f-tampil, sans-serif);
		cursor: pointer;
	}
	.preset button:hover,
	.aksi button:hover:not(:disabled) {
		border-color: var(--aksen);
		color: var(--aksen);
	}
	.preset .unduh {
		margin-left: auto;
		border-color: rgb(var(--amber-rgb) / 0.45);
		color: var(--amber);
	}
	.catatan {
		font-size: 11.5px;
		color: var(--redup-2);
		margin: 10px 0 0;
	}
	.hasil {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 460px), 1fr));
		gap: 16px;
		margin-top: 18px;
	}
	.kartu {
		margin: 0;
		animation: naik 0.55s cubic-bezier(0.2, 0.9, 0.3, 1) both;
	}
	.kartu header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 12px;
		align-items: center;
		margin-bottom: 10px;
	}
	.kode {
		font: 700 13px var(--f-mono, monospace);
		padding: 6px 9px;
		border-radius: 9px;
		background: rgb(var(--ungu-rgb) / 0.16);
		color: var(--ungu-teks);
	}
	.kartu b {
		display: block;
		font-size: 13.5px;
		color: var(--kuat);
	}
	.kartu small {
		font-size: 11px;
		color: var(--redup-2);
	}
	.aksi {
		display: flex;
		gap: 5px;
	}
	.aksi button:disabled {
		opacity: 0.4;
	}
	pre {
		margin: 0 0 10px;
		padding: 10px 12px;
		border-radius: 10px;
		background: rgba(3, 6, 14, 0.9);
		color: #9ff8ea;
		font: 11px/1.5 var(--f-mono, monospace);
		white-space: pre-wrap;
	}
	.gulir {
		overflow: auto;
		max-height: 320px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font: 12px var(--f-mono, monospace);
	}
	th {
		position: sticky;
		top: 0;
		background: var(--th-bg);
		text-align: left;
		color: var(--redup);
		font-weight: 600;
		padding: 6px 8px;
	}
	td {
		padding: 6px 8px;
		border-top: 1px solid rgb(var(--kisi-rgb) / 0.07);
		color: var(--teks);
		white-space: nowrap;
	}
	.galat {
		color: var(--mawar);
		font-size: 12px;
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes naik {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	@media (max-width: 820px) {
		.isian {
			grid-template-columns: 1fr 1fr;
		}
		.isian label:first-child {
			grid-column: 1 / -1;
		}
		.jalan {
			grid-column: 1 / -1;
			justify-content: center;
		}
	}
</style>
