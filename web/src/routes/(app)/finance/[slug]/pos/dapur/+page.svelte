<script>
	/** Layar dapur / bar: tiket pesanan per stasiun, diperbarui otomatis tiap 5 detik. */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { data } = $props();
	/** @type {any[]} */
	let tiket = $state(data.tiket);
	let stasiun = $state('semua');
	let sekarang = $state(Date.now());
	let bunyi = $state(false);
	let galat = $state('');
	/** @type {Set<number>} */
	let baru = $state(new Set());
	const slug = $derived($page.params.slug);

	const KOLOM = [
		{ status: 'BARU', judul: 'Masuk', lanjut: 'DIMASAK', tombol: 'Mulai masak' },
		{ status: 'DIMASAK', judul: 'Dimasak', lanjut: 'SIAP', tombol: 'Siap' },
		{ status: 'SIAP', judul: 'Siap diantar', lanjut: 'DISAJIKAN', tombol: 'Sudah diantar' }
	];
	const namaStasiun = $derived(Object.fromEntries(data.stasiun.map((/** @type {any} */ s) => [s.kode, s.nama])));
	const tampil = $derived(tiket.filter((t) => stasiun === 'semua' || t.stasiun === stasiun));
	const selesai = $derived(tampil.filter((t) => t.status === 'DISAJIKAN').slice(-8).reverse());

	/** Waktu WIB "YYYY-MM-DD HH:MM:SS" → epoch ms */
	const waktuMs = (/** @type {string} */ s) => Date.parse(String(s).replace(' ', 'T') + '+07:00');
	const umurMenit = (/** @type {any} */ t) => Math.max(0, Math.floor((sekarang - waktuMs(t.dibuatPada)) / 60000));
	const warnaUmur = (/** @type {number} */ m) => (m >= 20 ? 'telat' : m >= 10 ? 'lama' : 'segar');

	function denting() {
		if (!bunyi) return;
		try {
			const ac = new AudioContext();
			const o = ac.createOscillator();
			const g = ac.createGain();
			o.frequency.value = 880;
			g.gain.setValueAtTime(0.18, ac.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
			o.connect(g).connect(ac.destination);
			o.start();
			o.stop(ac.currentTime + 0.6);
		} catch {
			/* perangkat tanpa audio */
		}
	}

	async function muat() {
		try {
			const r = await fetch(`/finance/${slug}/pos/dapur/tiket`);
			if (!r.ok) throw new Error();
			const j = await r.json();
			const lama = new Set(tiket.map((t) => t.id));
			const masuk = j.tiket.filter((/** @type {any} */ t) => !lama.has(t.id)).map((/** @type {any} */ t) => t.id);
			tiket = j.tiket;
			galat = '';
			if (masuk.length) {
				baru = new Set(masuk);
				denting();
				setTimeout(() => (baru = new Set()), 2500);
			}
		} catch {
			galat = 'Koneksi terputus — mencoba lagi…';
		}
	}

	async function ubah(/** @type {any} */ t, /** @type {string} */ status) {
		const awal = t.status;
		tiket = tiket.map((x) => (x.id === t.id ? { ...x, status } : x));
		const r = await fetch(`/finance/${slug}/pos/dapur/tiket`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: t.id, status })
		}).catch(() => null);
		if (!r?.ok) {
			tiket = tiket.map((x) => (x.id === t.id ? { ...x, status: awal } : x));
			galat = 'Status gagal disimpan. Coba lagi.';
		}
	}

	onMount(() => {
		try {
			stasiun = localStorage.getItem(`dapur-stasiun-${slug}`) || 'semua';
			bunyi = localStorage.getItem('dapur-bunyi') === '1';
		} catch {
			/* penyimpanan diblokir */
		}
		const a = setInterval(muat, 5000);
		const b = setInterval(() => (sekarang = Date.now()), 15000);
		return () => {
			clearInterval(a);
			clearInterval(b);
		};
	});

	function pilihStasiun(/** @type {string} */ s) {
		stasiun = s;
		try {
			localStorage.setItem(`dapur-stasiun-${slug}`, s);
		} catch {
			/* abaikan */
		}
	}
	function aturBunyi() {
		bunyi = !bunyi;
		try {
			localStorage.setItem('dapur-bunyi', bunyi ? '1' : '0');
		} catch {
			/* abaikan */
		}
		if (bunyi) denting();
	}
</script>

<svelte:head><title>Layar Dapur · {data.namaUnit}</title></svelte:head>

<div class="dapur">
	<header>
		<div class="judul">
			<a href={`/finance/${slug}/pos`} class="kembali" aria-label="Kembali ke kasir">←</a>
			<div>
				<h1>Layar Dapur</h1>
				<small>{data.namaUnit} · diperbarui otomatis</small>
			</div>
		</div>
		<div class="alat">
			{#if data.stasiun.length > 1}
				<div class="chip-grup" role="tablist" aria-label="Stasiun">
					<button role="tab" aria-selected={stasiun === 'semua'} class:aktif={stasiun === 'semua'} onclick={() => pilihStasiun('semua')}>Semua</button>
					{#each data.stasiun as s (s.kode)}
						<button role="tab" aria-selected={stasiun === s.kode} class:aktif={stasiun === s.kode} onclick={() => pilihStasiun(s.kode)}>{s.nama}</button>
					{/each}
				</div>
			{/if}
			<button class="bunyi" class:aktif={bunyi} onclick={aturBunyi} aria-pressed={bunyi}>{bunyi ? '🔔 Bunyi aktif' : '🔕 Bunyi mati'}</button>
		</div>
	</header>

	{#if galat}<p class="galat" role="status">{galat}</p>{/if}

	{#if !data.aktif}
		<div class="kosong besar">
			<p>Layar dapur belum aktif untuk unit ini.</p>
			<a href={`/finance/${slug}/pos/kelola/fitur`}>Atur di Kelola Kasir →</a>
		</div>
	{:else}
		<div class="kolom-kolom">
			{#each KOLOM as k (k.status)}
				{@const isi = tampil.filter((t) => t.status === k.status)}
				<section class={`kolom ${k.status.toLowerCase()}`}>
					<h2>{k.judul} <span>{isi.length}</span></h2>
					{#each isi as t (t.id)}
						{@const m = umurMenit(t)}
						<article class={`tiket ${warnaUmur(m)}`} class:berkedip={baru.has(t.id)}>
							<div class="kepala">
								<b>{t.label}</b>
								<span class="umur">{m} mnt</span>
							</div>
							{#if data.stasiun.length > 1}<span class="stasiun">{namaStasiun[t.stasiun] || t.stasiun}</span>{/if}
							<ul>
								{#each t.items as it, i (i)}
									<li><b>{it.qty}×</b> {it.nama}{#if it.catatan}<em>{it.catatan}</em>{/if}</li>
								{/each}
							</ul>
							<button class="lanjut" onclick={() => ubah(t, k.lanjut)}>{k.tombol}</button>
						</article>
					{:else}
						<p class="kosong">Tidak ada tiket</p>
					{/each}
				</section>
			{/each}
		</div>
		{#if selesai.length}
			<section class="selesai">
				<h2>Baru diantar</h2>
				<div class="baris-selesai">
					{#each selesai as t (t.id)}
						<button class="kecil" title="Kembalikan ke Siap" onclick={() => ubah(t, 'SIAP')}>{t.label} ↺</button>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.dapur {
		--latar: #f6f7f9;
		--kartu: #ffffff;
		--garis: #e3e6eb;
		--teks: #1b2330;
		--redup: #6a7383;
		--hijau: #15803d;
		--amber: #b45309;
		--merah: #b91c1c;
		--aksen: #2563eb;
		min-height: 100dvh;
		background: var(--latar);
		color: var(--teks);
		padding: 16px;
		font-family: inherit;
	}
	:global(.dark) .dapur {
		--latar: #0f141b;
		--kartu: #18202b;
		--garis: #2a3442;
		--teks: #e8edf4;
		--redup: #93a0b3;
		--hijau: #4ade80;
		--amber: #fbbf24;
		--merah: #f87171;
		--aksen: #60a5fa;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	.judul {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.kembali {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: var(--kartu);
		border: 1px solid var(--garis);
		color: var(--teks);
		text-decoration: none;
		font-size: 18px;
	}
	h1 {
		margin: 0;
		font-size: 20px;
		font-weight: 800;
	}
	small {
		color: var(--redup);
		font-size: 12px;
	}
	.alat {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip-grup {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: 12px;
		background: var(--kartu);
		border: 1px solid var(--garis);
		overflow-x: auto;
	}
	.chip-grup button,
	.bunyi {
		padding: 8px 14px;
		border-radius: 9px;
		border: 0;
		background: none;
		color: var(--redup);
		font-weight: 700;
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
	}
	.chip-grup button.aktif {
		background: var(--aksen);
		color: #fff;
	}
	.bunyi {
		background: var(--kartu);
		border: 1px solid var(--garis);
	}
	.bunyi.aktif {
		color: var(--aksen);
		border-color: var(--aksen);
	}
	.galat {
		margin: 0 0 12px;
		padding: 8px 12px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--merah) 12%, transparent);
		color: var(--merah);
		font-size: 13px;
	}
	.kolom-kolom {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		align-items: start;
	}
	.kolom h2,
	.selesai h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 10px;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--redup);
	}
	.kolom h2 span {
		padding: 1px 8px;
		border-radius: 99px;
		background: var(--kartu);
		border: 1px solid var(--garis);
		color: var(--teks);
	}
	.tiket {
		background: var(--kartu);
		border: 1px solid var(--garis);
		border-left: 5px solid var(--hijau);
		border-radius: 14px;
		padding: 12px 14px;
		margin-bottom: 10px;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
	}
	.tiket.lama {
		border-left-color: var(--amber);
	}
	.tiket.telat {
		border-left-color: var(--merah);
	}
	.tiket.berkedip {
		animation: masuk 0.9s ease 2;
	}
	.kepala {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 16px;
	}
	.umur {
		font-weight: 700;
		font-size: 13px;
		color: var(--hijau);
		white-space: nowrap;
	}
	.lama .umur {
		color: var(--amber);
	}
	.telat .umur {
		color: var(--merah);
	}
	.stasiun {
		display: inline-block;
		margin-top: 4px;
		font-size: 11px;
		font-weight: 700;
		color: var(--aksen);
	}
	ul {
		list-style: none;
		margin: 8px 0 10px;
		padding: 0;
		font-size: 15px;
		line-height: 1.5;
	}
	li em {
		display: block;
		margin-left: 26px;
		font-size: 13px;
		color: var(--amber);
	}
	.lanjut {
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		border: 0;
		background: var(--aksen);
		color: #fff;
		font-weight: 800;
		font-size: 14px;
		cursor: pointer;
	}
	.siap .lanjut {
		background: var(--hijau);
	}
	.kosong {
		padding: 18px;
		text-align: center;
		color: var(--redup);
		font-size: 13px;
		border: 1px dashed var(--garis);
		border-radius: 14px;
	}
	.kosong.besar {
		margin-top: 40px;
	}
	.kosong a {
		color: var(--aksen);
		font-weight: 700;
	}
	.selesai {
		margin-top: 18px;
	}
	.baris-selesai {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.kecil {
		padding: 6px 12px;
		border-radius: 99px;
		border: 1px solid var(--garis);
		background: var(--kartu);
		color: var(--redup);
		font-size: 12px;
		cursor: pointer;
	}
	@keyframes masuk {
		50% {
			box-shadow: 0 0 0 4px color-mix(in srgb, var(--aksen) 40%, transparent);
		}
	}
	@media (max-width: 860px) {
		.kolom-kolom {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tiket.berkedip {
			animation: none;
		}
	}
</style>
