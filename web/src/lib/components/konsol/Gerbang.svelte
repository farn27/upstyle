<script>
	/** Gerbang verifikasi dua langkah Ruang Kendali (pendaftaran pertama & masuk). */
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	/**
	 * @type {{ gerbang: { terdaftar: boolean, terkunci: number, uri?: string, qr?: string, rahasia?: string }, nama: string, peran: string }}
	 */
	let { gerbang, nama, peran } = $props();
	let kode = $state('');
	let pesan = $state('');
	let sibuk = $state(false);
	let terkunci = $state(0);
	let tersalin = $state(false);
	/** @type {HTMLInputElement} */
	let isian;

	onMount(() => {
		terkunci = gerbang.terkunci;
		isian?.focus();
		const t = setInterval(() => {
			if (terkunci > 0) terkunci -= 1;
		}, 1000);
		return () => clearInterval(t);
	});

	async function kirim(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (sibuk || kode.length !== 6 || terkunci > 0) return;
		sibuk = true;
		pesan = '';
		try {
			const r = await fetch('/api/konsol/masuk', { method: 'POST', headers: { 'content-type': 'application/json', 'x-konsol': '1' }, body: JSON.stringify({ kode }) });
			const j = await r.json().catch(() => ({}));
			if (r.ok) {
				await invalidateAll();
				return;
			}
			pesan = j.message || 'Gagal memverifikasi';
			if (j.terkunci) terkunci = j.terkunci;
			if (j.sisa === 0) terkunci = 15 * 60;
			kode = '';
			isian?.focus();
		} catch {
			pesan = 'Tidak dapat terhubung. Periksa koneksi.';
		} finally {
			sibuk = false;
		}
	}

	async function salin() {
		try {
			await navigator.clipboard.writeText((gerbang.rahasia || '').replace(/\s/g, ''));
			tersalin = true;
			setTimeout(() => (tersalin = false), 1800);
		} catch {
			/* abaikan */
		}
	}
	const menit = $derived(`${Math.floor(terkunci / 60)}:${String(terkunci % 60).padStart(2, '0')}`);
</script>

<div class="gerbang">
	<div class="kartu">
		<div class="gembok" aria-hidden="true">
			<svg viewBox="0 0 64 64" width="64" height="64">
				<circle cx="32" cy="32" r="30" class="cincin" />
				<circle cx="32" cy="32" r="22" class="cincin dua" />
				<rect x="21" y="29" width="22" height="17" rx="4" class="badan" />
				<path d="M25 29v-5a7 7 0 0 1 14 0v5" class="sengkang" />
				<circle cx="32" cy="37" r="2.4" class="lubang" />
			</svg>
		</div>
		<span class="kode-atas">VERIFIKASI DUA LANGKAH</span>
		<h1>{gerbang.terdaftar ? 'Buka Ruang Kendali' : 'Aktifkan Kunci Kedua'}</h1>
		<p class="sapa">Halo <b>{nama}</b> · peran <span class="peran">{peran}</span></p>

		{#if !gerbang.terdaftar}
			<ol class="langkah">
				<li>Pasang <b>Google Authenticator</b> (atau Microsoft Authenticator / Authy) di HP-mu.</li>
				<li>
					Tambahkan akun: pindai QR di bawah dari HP lain, <b>atau</b> ketuk "Buka di aplikasi authenticator" bila halaman ini dibuka di HP yang sama, <b>atau</b> ketik kunci manual.
				</li>
				<li>Masukkan kode 6 digit yang muncul untuk menyelesaikan.</li>
			</ol>
			<div class="daftar">
				{#if gerbang.qr}<img src={gerbang.qr} alt="QR code pendaftaran authenticator" width="180" height="180" />{/if}
				<div class="manual">
					<a class="tombol-hantu" href={gerbang.uri}>Buka di aplikasi authenticator</a>
					<span class="label">Kunci manual</span>
					<code>{gerbang.rahasia}</code>
					<button type="button" class="salin" onclick={salin}>{tersalin ? 'Tersalin ✓' : 'Salin kunci'}</button>
					<small>Jangan bagikan kunci ini. Kunci hanya tampil sampai 2FA aktif.</small>
				</div>
			</div>
		{/if}

		<form onsubmit={kirim}>
			<label for="kode-2fa">Kode 6 digit dari aplikasi authenticator</label>
			<input
				id="kode-2fa"
				bind:this={isian}
				bind:value={kode}
				oninput={() => (kode = kode.replace(/\D/g, '').slice(0, 6))}
				inputmode="numeric"
				autocomplete="one-time-code"
				placeholder="••••••"
				maxlength="6"
				disabled={terkunci > 0}
			/>
			<button type="submit" class="masuk" disabled={sibuk || kode.length !== 6 || terkunci > 0}>
				{#if terkunci > 0}Terkunci {menit}{:else if sibuk}Memeriksa…{:else}{gerbang.terdaftar ? 'Masuk' : 'Aktifkan & masuk'}{/if}
			</button>
			{#if pesan}<p class="galat" role="alert">{pesan}</p>{/if}
		</form>

		<div class="etik">
			<b>Dengan masuk, kamu terikat Kode Etik Akses Data:</b>
			<ul>
				<li>Hanya untuk menjaga sistem & riset yang disetujui pemilik usaha.</li>
				<li>Dilarang mengambil, menyalin, atau menyebarkan data pengguna (isi transaksi, pelanggan, karyawan).</li>
				<li>Semua akses tercatat di Jejak. Pelanggaran: akses dicabut & dapat diproses sesuai UU 27/2022 (PDP).</li>
			</ul>
		</div>
		<a class="kembali" href="/finance">← Kembali ke aplikasi</a>
	</div>
</div>

<style>
	.gerbang {
		grid-column: 1 / -1;
		grid-row: 1 / -1;
		position: relative;
		z-index: 2;
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 32px 16px;
	}
	.kartu {
		width: min(520px, 100%);
		padding: 30px 28px 24px;
		border-radius: 22px;
		background: var(--panel-bg);
		border: 1px solid rgb(var(--kisi-rgb) / 0.14);
		box-shadow: 0 30px 80px rgb(var(--kisi-rgb) / 0.18);
		backdrop-filter: blur(10px);
		text-align: center;
		animation: naik 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) both;
	}
	.gembok svg {
		overflow: visible;
	}
	.cincin {
		fill: none;
		stroke: rgb(var(--aksen-rgb) / 0.4);
		stroke-dasharray: 6 6;
		transform-origin: 32px 32px;
		animation: putar 14s linear infinite;
	}
	.cincin.dua {
		stroke: rgb(var(--ungu-rgb) / 0.4);
		stroke-dasharray: 2 5;
		animation-direction: reverse;
		animation-duration: 9s;
	}
	.badan {
		fill: var(--aksen);
	}
	.sengkang {
		fill: none;
		stroke: var(--aksen);
		stroke-width: 3.2;
		stroke-linecap: round;
	}
	.lubang {
		fill: var(--bg);
	}
	.kode-atas {
		display: block;
		margin-top: 12px;
		font: 10.5px var(--f-mono);
		letter-spacing: 2.5px;
		color: var(--aksen);
	}
	h1 {
		margin: 6px 0 4px;
		font: 700 26px var(--f-tampil);
		color: var(--kuat);
	}
	.sapa {
		margin: 0 0 16px;
		font-size: 13px;
		color: var(--redup);
	}
	.sapa b {
		color: var(--teks);
	}
	.peran {
		padding: 1px 8px;
		border-radius: 99px;
		background: rgb(var(--aksen-rgb) / 0.14);
		color: var(--aksen-teks);
		font: 11px var(--f-mono);
	}
	.langkah {
		list-style: decimal;
		text-align: left;
		margin: 0 0 14px;
		padding-left: 20px;
		font-size: 13px;
		line-height: 1.55;
		color: var(--teks-2);
	}
	.daftar {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 16px;
		align-items: center;
		text-align: left;
		padding: 14px;
		border-radius: 14px;
		background: rgb(var(--kisi-rgb) / 0.05);
		margin-bottom: 18px;
	}
	.daftar img {
		border-radius: 10px;
		background: #fff;
		padding: 6px;
	}
	.manual {
		display: grid;
		gap: 6px;
	}
	.label {
		font-size: 10.5px;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: var(--redup);
	}
	code {
		font: 600 13px var(--f-mono);
		color: var(--kuat);
		word-break: break-all;
	}
	.manual small {
		font-size: 11px;
		color: var(--redup-2);
	}
	.tombol-hantu,
	.salin {
		justify-self: start;
		padding: 6px 12px;
		border-radius: 9px;
		border: 1px solid rgb(var(--aksen-rgb) / 0.45);
		background: none;
		color: var(--aksen-teks);
		font: 600 12px var(--f-tampil);
		text-decoration: none;
		cursor: pointer;
	}
	form {
		display: grid;
		gap: 10px;
	}
	form label {
		font-size: 12px;
		color: var(--redup);
	}
	input {
		text-align: center;
		font: 700 28px var(--f-mono);
		letter-spacing: 12px;
		padding: 12px;
		border-radius: 14px;
		border: 1.5px solid rgb(var(--kisi-rgb) / 0.25);
		background: var(--kolom-bg);
		color: var(--kuat);
		outline: none;
	}
	input:focus {
		border-color: var(--aksen);
		box-shadow: 0 0 0 4px rgb(var(--aksen-rgb) / 0.15);
	}
	.masuk {
		padding: 13px;
		border-radius: 12px;
		border: 0;
		background: linear-gradient(90deg, var(--aksen), var(--ungu));
		color: #fff;
		font: 700 14px var(--f-tampil);
		cursor: pointer;
	}
	.masuk:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.galat {
		margin: 0;
		color: var(--mawar-teks);
		font-size: 13px;
	}
	.etik {
		margin-top: 20px;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px dashed rgb(var(--amber-rgb) / 0.5);
		text-align: left;
		font-size: 12px;
		color: var(--teks-2);
	}
	.etik ul {
		list-style: disc;
		margin: 6px 0 0;
		padding-left: 18px;
		line-height: 1.55;
	}
	.kembali {
		display: inline-block;
		margin-top: 16px;
		font-size: 12px;
		color: var(--redup);
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes naik {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.98);
		}
	}
	@media (max-width: 520px) {
		.daftar {
			grid-template-columns: 1fr;
			justify-items: center;
		}
		input {
			letter-spacing: 8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cincin,
		.kartu {
			animation: none;
		}
	}
</style>
