<script>
	import Satelit from './Satelit.svelte';
	import { relatif } from './util.js';
	/** @type {{ data: any }} */
	let { data } = $props();
</script>

<section class="panel etik">
	<header class="judul-panel"><span>Kode Etik Akses Data</span><small>berlaku untuk seluruh tim · UU 27/2022 (PDP)</small></header>
	<div class="etik-kisi">
		<div>
			<h5 class="boleh">Boleh dilihat (menjaga sistem)</h5>
			<ul>
				<li>Kesehatan layanan, galat (disamarkan), versi, ukuran basis data</li>
				<li>Jumlah aktivitas per unit — bukan isinya</li>
				<li>Pemakaian token AI per pengguna (kuota & biaya)</li>
				<li>Nama usaha, username, email yang disamarkan</li>
			</ul>
		</div>
		<div>
			<h5 class="larang">Tidak boleh — dikunci di sistem</h5>
			<ul>
				<li>Isi transaksi, nominal, foto nota, isi chat AI</li>
				<li>Omzet, saldo, laba tenant</li>
				<li>Data pelanggan & karyawan (identitas, kontak, gaji)</li>
				<li>Kredensial: password, token, PIN</li>
				<li>Masuk sebagai pengguna / mengubah data tenant</li>
			</ul>
		</div>
		<div>
			<h5 class="syarat">Pengecualian & sanksi</h5>
			<ul>
				<li>Riset: hanya unit yang pemiliknya menyetujui; setiap kueri tercatat</li>
				<li>Kredensial basis data hanya dipegang pemilik sistem</li>
				<li>Pelanggaran: akses dicabut, pemilik data diberi tahu (≤ 3×24 jam), dapat diproses pidana UU PDP</li>
			</ul>
		</div>
	</div>
</section>

<div class="dua">
	<section class="panel">
		<header class="judul-panel"><span>Jejak Ruang Kendali</span><small>siapa membuka & mengubah apa di halaman ini</small></header>
		{#if data.audit.length}
			<ol class="garis-waktu ungu">
				{#each data.audit as a, i (a.id)}
					<li style={`animation-delay:${Math.min(i, 15) * 40}ms`}>
						<span class="simpul"></span>
						<div>
							<b>{a.pesan}</b>
							<small>{a.oleh} · {String(a.waktu).slice(0, 16)} · {relatif(a.waktu)}</small>
						</div>
					</li>
				{/each}
			</ol>
		{:else}
			<Satelit kecil teks="Belum ada jejak." />
		{/if}
	</section>
	<section class="panel">
		<header class="judul-panel"><span>Aksi Pengguna Terbaru</span><small>hanya modul & waktu — isi aksi tidak ditampilkan (privasi)</small></header>
		{#if data.aksi.length}
			<ol class="garis-waktu">
				{#each data.aksi as a, i (a.id)}
					<li class={a.tipe} style={`animation-delay:${Math.min(i, 15) * 40}ms`}>
						<span class="simpul"></span>
						<div>
							<b>Aksi pada modul <span class="tag">{a.kategori}</span>{a.tipe === 'error' ? ' — gagal' : ''}</b>
							<small>{a.unit} · {a.oleh} · {relatif(a.waktu)}</small>
						</div>
					</li>
				{/each}
			</ol>
		{:else}
			<Satelit kecil teks="Belum ada aksi." />
		{/if}
	</section>
</div>

<style>
	.etik-kisi {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		font-size: 12.5px;
		color: var(--teks-2);
	}
	.etik-kisi ul {
		list-style: disc;
		margin: 0;
		padding-left: 18px;
		line-height: 1.6;
	}
	h5 {
		margin: 0 0 6px;
		font-size: 11px;
		letter-spacing: 1.2px;
		text-transform: uppercase;
	}
	.boleh {
		color: var(--aksen-teks);
	}
	.larang {
		color: var(--mawar-teks);
	}
	.syarat {
		color: var(--amber);
	}
	.dua {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.garis-waktu {
		list-style: none;
		margin: 0;
		padding: 0 0 0 6px;
		position: relative;
		max-height: 620px;
		overflow: auto;
	}
	.garis-waktu::before {
		content: '';
		position: absolute;
		left: 10px;
		top: 6px;
		bottom: 6px;
		width: 1px;
		background: linear-gradient(var(--aksen), rgb(var(--aksen-rgb) / 0.05));
	}
	.garis-waktu.ungu::before {
		background: linear-gradient(var(--ungu), rgb(var(--ungu-rgb) / 0.05));
	}
	.garis-waktu li {
		display: grid;
		grid-template-columns: 16px 1fr;
		gap: 10px;
		padding: 7px 0;
		animation: geser 0.5s ease both;
	}
	.simpul {
		width: 9px;
		height: 9px;
		margin-top: 4px;
		border-radius: 50%;
		background: var(--bg);
		border: 2px solid var(--aksen);
		box-shadow: 0 0 8px rgb(var(--aksen-rgb) / 0.6);
		position: relative;
		z-index: 1;
	}
	.ungu .simpul {
		border-color: var(--ungu);
		box-shadow: 0 0 8px rgb(var(--ungu-rgb) / 0.6);
	}
	.garis-waktu li.error .simpul {
		border-color: var(--mawar);
	}
	.garis-waktu li.info .simpul {
		border-color: var(--biru);
	}
	.garis-waktu b {
		display: block;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--teks);
		line-height: 1.4;
	}
	.garis-waktu small {
		font-size: 11px;
		color: var(--redup-2);
	}
	.tag {
		font: 10px var(--f-mono, monospace);
		padding: 1px 6px;
		border-radius: 5px;
		background: rgb(var(--aksen-rgb) / 0.1);
		color: var(--aksen-teks);
	}
	@keyframes geser {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
	}
	@media (max-width: 900px) {
		.etik-kisi {
			grid-template-columns: 1fr;
		}
		.dua {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.garis-waktu li {
			animation: none;
		}
	}
</style>
