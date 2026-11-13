<script>
	import Orbit from './Orbit.svelte';
	import Ekg from './Ekg.svelte';
	import Area from './Area.svelte';
	import Angka from './Angka.svelte';
	import { singkat, angka, WARNA } from './util.js';

	/** @type {{ data: any, pilihUnit: (u: any) => void }} */
	let { data, pilihUnit } = $props();
	const a = $derived(data.angka);
	const bacaan = $derived([
		{ label: 'Pengguna', nilai: a.pengguna, sub: `+${a.penggunaBaru30} dalam 30 hari`, warna: WARNA.aqua },
		{ label: 'Unit aktif · 24 jam', nilai: a.unitAktif24, sub: `dari ${a.unit} unit bisnis`, warna: WARNA.hijau },
		{ label: 'Transaksi hari ini', nilai: a.trxHariIni, sub: `${angka(a.masukHariIni)} pemasukan · ${angka(a.keluarHariIni)} pengeluaran`, warna: WARNA.ungu },
		{ label: 'Order POS hari ini', nilai: a.posHariIni, sub: `dari ${angka(a.unitPosHariIni)} unit dengan kasir aktif`, warna: WARNA.biru },
		{ label: 'Token AI hari ini', nilai: a.aiTokenHariIni, sub: `${a.aiPermintaanHariIni} permintaan · ${a.aiGagalHariIni} gagal`, warna: WARNA.amber, singkat: true },
		{ label: 'Galat · 24 jam', nilai: a.galat24, sub: a.galat24 ? 'lihat stasiun Denyut' : 'tenang', warna: a.galat24 ? WARNA.mawar : WARNA.hijau }
	]);
	const tren = $derived(data.tren || []);
</script>

<div class="kisi-orbit">
	<section class="panel panel-orbit">
		<header class="judul-panel"><span>Peta Orbit Tenant</span><small>planet = unit bisnis · ketuk untuk detail</small></header>
		<Orbit units={data.units} pemilik={data.pemilik} pilih={pilihUnit} />
	</section>
	<div class="bacaan-daftar">
		{#each bacaan as b, i (b.label)}
			<div class="bacaan" style={`--aksen:${b.warna}; animation-delay:${i * 70}ms`}>
				<span class="lbl">{b.label}</span>
				<b class="nilai"><Angka nilai={b.nilai} format={b.singkat ? singkat : undefined} /></b>
				<span class="sub">{b.sub}</span>
			</div>
		{/each}
	</div>
</div>

<section class="panel">
	<header class="judul-panel"><span>Denyut 48 Jam</span><small>transaksi · order POS · aksi pengguna per jam (WIB)</small></header>
	<Ekg data={data.denyut} />
</section>

<section class="panel">
	<header class="judul-panel"><span>Lintasan 30 Hari</span><small>aktivitas harian seluruh tenant</small></header>
	<Area
		label={tren.map((/** @type {any} */ t) => t.tanggal.slice(8, 10) + '/' + t.tanggal.slice(5, 7))}
		seri={[
			{ nama: 'Order POS', warna: WARNA.ungu, nilai: tren.map((/** @type {any} */ t) => t.pos) },
			{ nama: 'Transaksi', warna: WARNA.aqua, nilai: tren.map((/** @type {any} */ t) => t.trx) }
		]}
	/>
</section>

<style>
	.kisi-orbit {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(250px, 1fr);
		gap: 18px;
		margin-bottom: 18px;
	}
	.bacaan-daftar {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		align-content: start;
	}
	.bacaan {
		position: relative;
		padding: 14px 14px 12px;
		border-radius: 14px;
		background: var(--kartu-bg);
		border: 1px solid rgb(var(--kisi-rgb) / 0.12);
		overflow: hidden;
		display: grid;
		gap: 4px;
		animation: naik 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) both;
	}
	.bacaan::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 3px;
		background: var(--aksen);
		box-shadow: 0 0 14px var(--aksen);
	}
	.bacaan::after {
		content: '';
		position: absolute;
		right: -30px;
		top: -30px;
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: radial-gradient(circle, color-mix(in srgb, var(--aksen) 30%, transparent), transparent 70%);
	}
	.lbl {
		font-size: 10.5px;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: var(--redup);
	}
	.nilai {
		font: 700 28px/1.1 var(--f-mono, monospace);
		color: var(--kuat);
	}
	.sub {
		font-size: 11px;
		color: var(--teks-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@keyframes naik {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	@media (max-width: 980px) {
		.kisi-orbit {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bacaan {
			animation: none;
		}
	}
</style>
