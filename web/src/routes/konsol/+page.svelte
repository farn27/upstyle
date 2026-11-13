<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Bintang from '$lib/components/konsol/Bintang.svelte';
	import Ikon from '$lib/components/konsol/Ikon.svelte';
	import Satelit from '$lib/components/konsol/Satelit.svelte';
	import BagOrbit from '$lib/components/konsol/BagOrbit.svelte';
	import BagDenyut from '$lib/components/konsol/BagDenyut.svelte';
	import BagNeuron from '$lib/components/konsol/BagNeuron.svelte';
	import BagTenant from '$lib/components/konsol/BagTenant.svelte';
	import BagRiset from '$lib/components/konsol/BagRiset.svelte';
	import BagJejak from '$lib/components/konsol/BagJejak.svelte';
	import LaciUnit from '$lib/components/konsol/LaciUnit.svelte';
	import { ambil } from '$lib/components/konsol/api.js';
	import { jamWIB, angka, singkat } from '$lib/components/konsol/util.js';

	let { data } = $props();

	const STASIUN = /** @type {const} */ ([
		{ id: 'orbit', nama: 'Orbit', judul: 'Orbit Tenant', ket: 'Seluruh pengguna & unit bisnis sebagai satu sistem tata surya — siapa yang hidup, siapa yang sunyi.' },
		{ id: 'denyut', nama: 'Denyut', judul: 'Denyut Sistem', ket: 'Kesehatan layanan, mesin server, konfigurasi, galat, dan peta basis data — diperiksa langsung.' },
		{ id: 'neuron', nama: 'Neuron', judul: 'Neuron AI', ket: 'Arus token, model, jam sibuk, dan kuota setiap pengguna. Kendalikan AI dari sini.' },
		{ id: 'tenant', nama: 'Rasi', judul: 'Rasi Tenant', ket: 'Setiap pemilik dan unitnya: volume, tren 14 hari, produk menipis, dan pemakaian AI.' },
		{ id: 'riset', nama: 'Riset', judul: 'Laboratorium Riset', ket: 'Kueri Lembar G untuk skripsi — pemeriksaan laporan (Tabel 4.11) & pola penggunaan (Tabel 4.15).' },
		{ id: 'jejak', nama: 'Jejak', judul: 'Jejak Audit', ket: 'Rekam akses Ruang Kendali dan aksi pengguna terbaru di seluruh tenant.' }
	]);
	/** @typedef {typeof STASIUN[number]['id']} IdStasiun */

	/** @type {IdStasiun} */
	let aktif = $state('orbit');
	/** @type {Record<string, any>} */
	let isi = $state({});
	/** @type {Record<string, string>} */
	let galat = $state({});
	/** @type {Record<string, boolean>} */
	let memuat = $state({});
	/** @type {Record<string, string>} */
	let diperbarui = $state({});
	let langsung = $state(true);
	let jam = $state(jamWIB());
	/** @type {any} */
	let unitTerpilih = $state(null);
	/** @type {{ id: number, pesan: string, jenis: string }[]} */
	let toast = $state([]);

	const st = $derived(STASIUN.find((s) => s.id === aktif) || STASIUN[0]);
	const BERDATA = new Set(['orbit', 'denyut', 'neuron', 'tenant', 'jejak']);

	/** @param {string} id @param {boolean} [diam] */
	async function muat(id, diam = false) {
		if (!BERDATA.has(id)) return;
		if (!diam) memuat[id] = true;
		try {
			isi[id] = await ambil(id);
			galat[id] = '';
			diperbarui[id] = jamWIB();
		} catch (e) {
			galat[id] = e instanceof Error ? e.message : 'Gagal memuat';
		} finally {
			memuat[id] = false;
		}
	}

	/** @param {IdStasiun} id */
	function pindah(id) {
		if (id === aktif) return;
		aktif = id;
		if (typeof history !== 'undefined') history.replaceState(null, '', `#${id}`);
		if (!isi[id]) muat(id);
		else muat(id, true);
		if (id === 'neuron' && !isi.denyut) muat('denyut', true);
	}

	/** @param {string} pesan @param {string} [jenis] */
	function beritahu(pesan, jenis = 'ok') {
		const id = Date.now() + Math.random();
		toast = [...toast, { id, pesan, jenis }];
		setTimeout(() => (toast = toast.filter((t) => t.id !== id)), 4200);
	}

	onMount(() => {
		const h = /** @type {IdStasiun} */ (location.hash.slice(1));
		if (STASIUN.some((s) => s.id === h)) aktif = h;
		muat(aktif);
		if (aktif !== 'denyut') muat('denyut', true);
		if (aktif !== 'orbit') muat('orbit', true);

		const detik = setInterval(() => (jam = jamWIB()), 1000);
		const segar = setInterval(() => {
			if (langsung && document.visibilityState === 'visible' && BERDATA.has(aktif) && aktif !== 'tenant') muat(aktif, true);
			if (langsung && document.visibilityState === 'visible' && aktif !== 'denyut') muat('denyut', true);
		}, 30000);
		/** @param {KeyboardEvent} e */
		const tombol = (e) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return;
			const n = Number(e.key);
			if (n >= 1 && n <= STASIUN.length) pindah(STASIUN[n - 1].id);
			if (e.key === 'r') muat(aktif);
		};
		const hash = () => {
			const h = /** @type {IdStasiun} */ (location.hash.slice(1));
			if (STASIUN.some((s) => s.id === h)) pindah(h);
		};
		window.addEventListener('keydown', tombol);
		window.addEventListener('hashchange', hash);
		return () => {
			clearInterval(detik);
			clearInterval(segar);
			window.removeEventListener('keydown', tombol);
			window.removeEventListener('hashchange', hash);
		};
	});

	/** Teks ticker berjalan. */
	const ticker = $derived.by(() => {
		const d = isi.denyut;
		const o = isi.orbit;
		/** @type {{ t: string, s: string }[]} */
		const xs = [];
		if (d) {
			for (const [k, nama] of [
				['db', 'MySQL'],
				['redis', 'Redis'],
				['socket', 'Socket.io'],
				['groq', 'Groq']
			]) {
				const l = d.layanan[k];
				xs.push({ t: `${nama} ${l.ok ? `${l.ms} ms` : 'TERPUTUS'}`, s: l.ok ? 'ok' : 'galat' });
			}
			xs.push({ t: `heap ${d.runtime.memoriMB.heap} MB`, s: 'info' });
			xs.push({ t: `versi ${d.runtime.commit || 'lokal'}`, s: 'info' });
		}
		if (o) {
			xs.push({ t: `${angka(o.angka.unitAktif24)}/${angka(o.angka.unit)} unit aktif`, s: 'ok' });
			xs.push({ t: `${angka(o.angka.trxHariIni)} transaksi hari ini`, s: 'info' });
			xs.push({ t: `${singkat(o.angka.aiTokenHariIni)} token AI`, s: 'info' });
			xs.push({ t: `${o.angka.galat24} galat 24 j`, s: o.angka.galat24 ? 'galat' : 'ok' });
		}
		return xs.length ? xs : [{ t: 'menghubungkan ke instrumen…', s: 'info' }];
	});
	const sehat = $derived(isi.denyut ? Object.values(isi.denyut.layanan).every((/** @type {any} */ l) => l.ok) : null);

	/**
	 * Transisi "tirai cahaya" saat berpindah stasiun.
	 * @param {Element} _n
	 */
	function tirai(_n) {
		const diam = matchMedia('(prefers-reduced-motion: reduce)').matches;
		return {
			duration: diam ? 0 : 650,
			easing: cubicOut,
			css: (/** @type {number} */ t) => `clip-path: inset(0 ${(1 - t) * 100}% 0 0); filter: blur(${(1 - t) * 6}px); opacity:${0.3 + t * 0.7}`
		};
	}
</script>

<svelte:head>
	<title>Ruang Kendali · Bizgrow</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="theme-color" content="#05070f" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="ruang">
	<Bintang />
	<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
	<div class="kisi-latar" aria-hidden="true"></div>

	<header class="pita">
		<a class="lambang" href="/konsol" aria-label="Ruang Kendali">
			<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
				<defs>
					<radialGradient id="lb-inti" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fff" /><stop offset="45%" stop-color="#3ef0d0" /><stop offset="100%" stop-color="#3b2a9e" /></radialGradient>
				</defs>
				<circle cx="20" cy="20" r="7" fill="url(#lb-inti)" />
				<g class="lb-cincin"><ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke="#9b8cff" stroke-width="1.2" /><circle cx="37" cy="20" r="2" fill="#ffc65c" /></g>
				<g class="lb-cincin dua"><ellipse cx="20" cy="20" rx="7" ry="17" fill="none" stroke="#3ef0d0" stroke-width="1" stroke-dasharray="2 3" /></g>
			</svg>
			<span>
				<b>RUANG KENDALI</b>
				<small>observatorium bizgrow</small>
			</span>
		</a>
		<div class="ticker" aria-live="off">
			<div class="ticker-isi">
				{#each [0, 1] as k (k)}
					<span class="ticker-grup" aria-hidden={k === 1}>
						{#each ticker as t, i (i)}<span class={`tk ${t.s}`}><i></i>{t.t}</span>{/each}
					</span>
				{/each}
			</div>
		</div>
		<div class="kanan">
			<span class="sehat" class:buruk={sehat === false} title="Status layanan">
				<i></i>{sehat == null ? '…' : sehat ? 'semua sistem normal' : 'ada layanan bermasalah'}
			</span>
			<label class="saklar" title="Muat ulang otomatis tiap 30 detik">
				<input type="checkbox" bind:checked={langsung} />
				<span class="rel"><span></span></span>
				Langsung
			</label>
			<span class="jam">{jam}<small>WIB</small></span>
			<a class="keluar" href="/finance">← Aplikasi</a>
		</div>
	</header>

	<nav class="rel" aria-label="Stasiun">
		{#each STASIUN as s, i (s.id)}
			<button class="stasiun" class:aktif={aktif === s.id} onclick={() => pindah(s.id)} aria-current={aktif === s.id ? 'page' : undefined}>
				<span class="no">0{i + 1}</span>
				<Ikon nama={s.id} aktif={aktif === s.id} />
				<span class="nm">{s.nama}</span>
				{#if aktif === s.id}<span class="sorot" in:fly={{ y: 8, duration: 300 }}></span>{/if}
			</button>
		{/each}
		<div class="petunjuk">tekan <kbd>1</kbd>–<kbd>6</kbd> pindah · <kbd>r</kbd> muat ulang</div>
	</nav>

	<main class="panggung">
		{#key aktif}
			<div class="kepala-stasiun" in:tirai>
				<div class="judul">
					<span class="kode">STASIUN 0{STASIUN.indexOf(st) + 1} · {st.id.toUpperCase()}</span>
					<h1>{st.judul}</h1>
					<p>{st.ket}</p>
				</div>
				{#if BERDATA.has(aktif)}
					<button class="segar" onclick={() => muat(aktif)} disabled={memuat[aktif]} aria-label="Muat ulang">
						<svg viewBox="0 0 24 24" width="16" height="16" class:putar={memuat[aktif]} aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" /></svg>
						{diperbarui[aktif] ? `diperbarui ${diperbarui[aktif]}` : 'memuat…'}
					</button>
				{/if}
			</div>

			<div class="isi-stasiun" in:fly={{ y: 24, duration: 600, delay: 120, easing: cubicOut }}>
				{#if aktif === 'riset'}
					<BagRiset {beritahu} />
				{:else if galat[aktif] && !isi[aktif]}
					<Satelit teks={`Sinyal terputus: ${galat[aktif]}`} />
				{:else if !isi[aktif]}
					<Satelit teks="Mengkalibrasi instrumen…" />
				{:else if aktif === 'orbit'}
					<BagOrbit data={isi.orbit} pilihUnit={(u) => (unitTerpilih = u)} />
				{:else if aktif === 'denyut'}
					<BagDenyut data={isi.denyut} />
				{:else if aktif === 'neuron'}
					<BagNeuron data={isi.neuron} denyut={isi.denyut} {beritahu} muatUlang={() => muat('neuron', true)} />
				{:else if aktif === 'tenant'}
					<BagTenant data={isi.tenant} pilihUnit={(u) => (unitTerpilih = u)} />
				{:else if aktif === 'jejak'}
					<BagJejak data={isi.jejak} />
				{/if}
			</div>
		{/key}
		<footer class="kaki">Ruang Kendali hanya terlihat oleh superadmin · semua akses tercatat di Jejak · masuk sebagai <b>{data.admin.nama}</b></footer>
	</main>

	{#if unitTerpilih}
		<LaciUnit unit={unitTerpilih} tutup={() => (unitTerpilih = null)} />
	{/if}

	<div class="toast-wadah" aria-live="polite">
		{#each toast as t (t.id)}
			<div class={`toast ${t.jenis}`} in:fly={{ x: 40, duration: 300 }} out:fly={{ x: 40, duration: 250 }}>{t.pesan}</div>
		{/each}
	</div>
</div>

<style>
	:global(body:has(.ruang)) {
		background: #05070f;
		color-scheme: dark;
	}
	.ruang {
		--f-tampil: 'Space Grotesk', 'Manrope', system-ui, sans-serif;
		--f-mono: 'JetBrains Mono', ui-monospace, monospace;
		position: relative;
		min-height: 100vh;
		background: radial-gradient(1200px 700px at 80% -10%, #121a44 0%, transparent 60%), radial-gradient(900px 600px at -10% 110%, #0b2a35 0%, transparent 60%), #05070f;
		color: #e6ecff;
		font-family: var(--f-tampil);
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		grid-template-rows: auto 1fr;
		overflow-x: clip;
	}
	.aurora {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		filter: blur(70px);
		opacity: 0.5;
	}
	.aurora i {
		position: absolute;
		border-radius: 50%;
		animation: hanyut 22s ease-in-out infinite alternate;
	}
	.aurora i:nth-child(1) {
		width: 46vw;
		height: 30vw;
		left: 30%;
		top: -12vw;
		background: radial-gradient(circle, rgba(62, 240, 208, 0.35), transparent 65%);
	}
	.aurora i:nth-child(2) {
		width: 40vw;
		height: 34vw;
		right: -10vw;
		top: 30%;
		background: radial-gradient(circle, rgba(155, 140, 255, 0.35), transparent 65%);
		animation-duration: 28s;
	}
	.aurora i:nth-child(3) {
		width: 36vw;
		height: 26vw;
		left: -8vw;
		bottom: -10vw;
		background: radial-gradient(circle, rgba(255, 107, 138, 0.2), transparent 65%);
		animation-duration: 34s;
	}
	.kisi-latar {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background-image: linear-gradient(rgba(140, 170, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(140, 170, 255, 0.035) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 80%);
	}

	/* ── pita atas ── */
	.pita {
		grid-column: 1 / -1;
		position: sticky;
		top: 0;
		z-index: 20;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 18px;
		align-items: center;
		padding: 10px 18px;
		background: rgba(5, 7, 15, 0.72);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid rgba(140, 170, 255, 0.1);
	}
	.lambang {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
	}
	.lambang b {
		display: block;
		font: 700 14px var(--f-tampil);
		letter-spacing: 3px;
		background: linear-gradient(90deg, #fff, #9ff8ea);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.lambang small {
		font: 9.5px var(--f-mono);
		letter-spacing: 2px;
		color: #6f7ba0;
		text-transform: uppercase;
	}
	.lb-cincin {
		transform-origin: 20px 20px;
		animation: putar 9s linear infinite;
	}
	.lb-cincin.dua {
		animation-duration: 14s;
		animation-direction: reverse;
	}
	.ticker {
		overflow: hidden;
		mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
	}
	.ticker-isi {
		display: flex;
		width: max-content;
		animation: geser 40s linear infinite;
	}
	.ticker:hover .ticker-isi {
		animation-play-state: paused;
	}
	.ticker-grup {
		display: flex;
		gap: 26px;
		padding-right: 26px;
	}
	.tk {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font: 11.5px var(--f-mono);
		color: #b9c3e3;
		white-space: nowrap;
	}
	.tk i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #5aa8ff;
	}
	.tk.ok i {
		background: #3ef0d0;
		box-shadow: 0 0 6px #3ef0d0;
	}
	.tk.galat {
		color: #ff9fb3;
	}
	.tk.galat i {
		background: #ff6b8a;
		box-shadow: 0 0 6px #ff6b8a;
	}
	.kanan {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.sehat {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 11.5px;
		color: #9ff8ea;
		white-space: nowrap;
	}
	.sehat i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #3ef0d0;
		animation: nadi 2s infinite;
	}
	.sehat.buruk {
		color: #ff9fb3;
	}
	.sehat.buruk i {
		background: #ff6b8a;
	}
	.saklar {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 11.5px;
		color: #b9c3e3;
		cursor: pointer;
	}
	.saklar input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.saklar .rel {
		width: 30px;
		height: 17px;
		border-radius: 99px;
		background: rgba(140, 170, 255, 0.2);
		position: relative;
		transition: background 0.2s;
	}
	.saklar .rel span {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.2s;
	}
	.saklar input:checked + .rel {
		background: #3ef0d0;
	}
	.saklar input:checked + .rel span {
		transform: translateX(13px);
	}
	.saklar input:focus-visible + .rel {
		outline: 2px solid #9b8cff;
		outline-offset: 2px;
	}
	.jam {
		font: 600 15px var(--f-mono);
		color: #fff;
		font-variant-numeric: tabular-nums;
	}
	.jam small {
		font-size: 9px;
		color: #6f7ba0;
		margin-left: 4px;
	}
	.keluar {
		font-size: 12px;
		color: #8a96b8;
		text-decoration: none;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid rgba(140, 170, 255, 0.18);
	}
	.keluar:hover {
		color: #fff;
		border-color: #3ef0d0;
	}

	/* ── rel stasiun ── */
	nav.rel {
		position: sticky;
		top: 62px;
		align-self: start;
		z-index: 10;
		display: grid;
		gap: 6px;
		padding: 18px 10px;
	}
	.stasiun {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 3px;
		padding: 12px 4px 10px;
		border-radius: 16px;
		border: 1px solid transparent;
		background: none;
		color: #6f7ba0;
		cursor: pointer;
		transition:
			color 0.2s,
			background 0.2s,
			border-color 0.2s,
			transform 0.2s;
	}
	.stasiun:hover {
		color: #e6ecff;
		transform: translateX(2px);
	}
	.stasiun.aktif {
		color: #3ef0d0;
		background: linear-gradient(160deg, rgba(62, 240, 208, 0.12), rgba(155, 140, 255, 0.06));
		border-color: rgba(62, 240, 208, 0.28);
		box-shadow: 0 0 24px rgba(62, 240, 208, 0.12) inset;
	}
	.stasiun:focus-visible {
		outline: 2px solid #9b8cff;
		outline-offset: 2px;
	}
	.no {
		font: 9px var(--f-mono);
		opacity: 0.6;
	}
	.nm {
		font: 600 11px var(--f-tampil);
		letter-spacing: 0.5px;
	}
	.sorot {
		position: absolute;
		left: -10px;
		top: 22%;
		bottom: 22%;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: #3ef0d0;
		box-shadow: 0 0 12px #3ef0d0;
	}
	.petunjuk {
		margin-top: 14px;
		font: 9.5px/1.6 var(--f-mono);
		color: #4b5578;
		text-align: center;
	}
	kbd {
		font: inherit;
		padding: 0 4px;
		border-radius: 4px;
		border: 1px solid #2c3556;
		color: #8a96b8;
	}

	/* ── panggung ── */
	.panggung {
		position: relative;
		z-index: 1;
		padding: 26px 28px 60px 10px;
		min-width: 0;
	}
	.kepala-stasiun {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		margin-bottom: 22px;
	}
	.kode {
		font: 10.5px var(--f-mono);
		letter-spacing: 2.5px;
		color: #3ef0d0;
	}
	h1 {
		margin: 6px 0 6px;
		font: 700 clamp(28px, 4.2vw, 46px) / 1.05 var(--f-tampil);
		letter-spacing: -0.5px;
		background: linear-gradient(100deg, #ffffff 10%, #b8fff2 45%, #c9c0ff 80%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.judul p {
		margin: 0;
		max-width: 640px;
		color: #8a96b8;
		font-size: 14px;
		line-height: 1.5;
	}
	.segar {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid rgba(140, 170, 255, 0.2);
		background: rgba(10, 14, 30, 0.6);
		color: #b9c3e3;
		font: 11.5px var(--f-mono);
		cursor: pointer;
		white-space: nowrap;
	}
	.segar svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.segar svg.putar {
		animation: putar 0.8s linear infinite;
	}
	.segar:hover:not(:disabled) {
		border-color: #3ef0d0;
		color: #fff;
	}

	/* panel bersama untuk semua stasiun */
	.ruang :global(.panel) {
		position: relative;
		padding: 18px 18px 16px;
		margin-bottom: 18px;
		border-radius: 18px;
		background: linear-gradient(170deg, rgba(16, 23, 46, 0.78), rgba(8, 12, 26, 0.68));
		border: 1px solid rgba(140, 170, 255, 0.11);
		backdrop-filter: blur(6px);
		min-width: 0;
	}
	.ruang :global(.panel)::before,
	.ruang :global(.panel)::after {
		content: '';
		position: absolute;
		width: 14px;
		height: 14px;
		border: 1.5px solid rgba(62, 240, 208, 0.45);
		pointer-events: none;
	}
	.ruang :global(.panel)::before {
		top: -1px;
		left: -1px;
		border-right: 0;
		border-bottom: 0;
		border-radius: 18px 0 0 0;
	}
	.ruang :global(.panel)::after {
		bottom: -1px;
		right: -1px;
		border-left: 0;
		border-top: 0;
		border-radius: 0 0 18px 0;
	}
	.ruang :global(.judul-panel) {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.ruang :global(.judul-panel span) {
		font: 600 15px var(--f-tampil);
		color: #fff;
	}
	.ruang :global(.judul-panel small) {
		font: 10.5px var(--f-mono);
		color: #6f7ba0;
	}
	.ruang :global(.kisi-2) {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
		gap: 18px;
	}
	.kaki {
		margin-top: 26px;
		font: 10.5px var(--f-mono);
		color: #4b5578;
		text-align: center;
	}
	.kaki b {
		color: #8a96b8;
	}

	/* toast */
	.toast-wadah {
		position: fixed;
		right: 18px;
		bottom: 18px;
		z-index: 60;
		display: grid;
		gap: 8px;
	}
	.toast {
		padding: 11px 16px;
		border-radius: 12px;
		font-size: 13px;
		background: rgba(8, 12, 26, 0.95);
		border: 1px solid rgba(62, 240, 208, 0.45);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		max-width: 360px;
	}
	.toast.galat {
		border-color: rgba(255, 107, 138, 0.6);
		color: #ffc1ce;
	}

	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes geser {
		to {
			transform: translateX(-50%);
		}
	}
	@keyframes hanyut {
		to {
			transform: translate(6vw, 4vw) scale(1.15);
		}
	}
	@keyframes nadi {
		0% {
			box-shadow: 0 0 0 0 rgba(62, 240, 208, 0.6);
		}
		70% {
			box-shadow: 0 0 0 8px rgba(62, 240, 208, 0);
		}
	}

	/* ── layar sempit ── */
	@media (max-width: 1100px) {
		.ruang :global(.kisi-2) {
			grid-template-columns: 1fr;
		}
		.sehat {
			display: none;
		}
	}
	@media (max-width: 860px) {
		.ruang {
			grid-template-columns: 1fr;
		}
		.pita {
			grid-template-columns: 1fr auto;
			padding: 10px 16px;
		}
		.ticker {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		.keluar,
		.jam small,
		.lambang small {
			display: none;
		}
		.lambang b {
			letter-spacing: 2px;
			white-space: nowrap;
		}
		nav.rel {
			position: fixed;
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 30;
			display: flex;
			gap: 2px;
			padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
			overflow-x: auto;
			background: rgba(5, 7, 15, 0.9);
			backdrop-filter: blur(14px);
			border-top: 1px solid rgba(140, 170, 255, 0.12);
		}
		.stasiun {
			flex: 1 0 60px;
			padding: 8px 2px 6px;
		}
		.stasiun:hover {
			transform: none;
		}
		.no,
		.petunjuk {
			display: none;
		}
		.sorot {
			left: 22%;
			right: 22%;
			top: -7px;
			bottom: auto;
			width: auto;
			height: 3px;
			border-radius: 0 0 3px 3px;
		}
		.panggung {
			padding: 18px 16px 96px;
		}
		.kepala-stasiun {
			flex-direction: column;
			align-items: flex-start;
		}
		.toast-wadah {
			bottom: 84px;
			left: 16px;
			right: 16px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.aurora i,
		.lb-cincin,
		.ticker-isi,
		.sehat i,
		.segar svg.putar {
			animation: none;
		}
	}
</style>
