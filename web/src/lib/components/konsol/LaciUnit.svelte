<script>
	/** Laci detail unit bisnis: peta panas aktivitas, modul yang dipakai, metode bayar, aksi terakhir. */
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import PetaPanas from './PetaPanas.svelte';
	import Cincin from './Cincin.svelte';
	import Satelit from './Satelit.svelte';
	import { ambil } from './api.js';
	import { warnaDari, relatif, angka } from './util.js';

	/** @type {{ unit: any, tutup: () => void }} */
	let { unit, tutup } = $props();
	/** @type {any} */
	let detail = $state(null);
	let galat = $state('');

	$effect(() => {
		const id = unit?.id;
		detail = null;
		galat = '';
		if (!id) return;
		ambil(`unit?id=${id}`)
			.then((d) => (detail = d))
			.catch((e) => (galat = e.message));
	});

	const maksModul = $derived(Math.max(1, ...(detail?.modul || []).map((/** @type {any} */ m) => m.n)));
	/** @param {KeyboardEvent} e */
	const esc = (e) => e.key === 'Escape' && tutup();
</script>

<svelte:window onkeydown={esc} />

<div class="tirai" transition:fade={{ duration: 200 }} onclick={tutup} role="presentation"></div>
<aside class="laci" transition:fly={{ x: 480, duration: 420, easing: cubicOut }} aria-label={`Detail ${unit.nama}`}>
	<header>
		<span class="planet" style={`--w:${warnaDari(unit.kategori)}`}></span>
		<div>
			<small>{unit.kategori}{unit.cabang ? ' · cabang' : ''}</small>
			<h3>{unit.nama}</h3>
			{#if detail}<small>pemilik {detail.pemilik}</small>{/if}
		</div>
		<button class="tutup" onclick={tutup} aria-label="Tutup">✕</button>
	</header>

	<div class="ringkas">
		<span><b>{angka(unit.trx30)}</b>transaksi 30 hr</span>
		<span><b>{angka(unit.pos30)}</b>order POS 30 hr</span>
		<span><b>{relatif(unit.akhir)}</b>aktivitas terakhir</span>
	</div>

	{#if galat}
		<p class="galat">{galat}</p>
	{:else if !detail}
		<Satelit kecil teks="Mengambil telemetri unit…" />
	{:else}
		<h4>Peta Panas Aktivitas</h4>
		<PetaPanas data={detail.panas} />

		<div class="dua">
			<div>
				<h4>Modul yang Dipakai · 30 hr</h4>
				{#if detail.modul.length}
					<ul class="modul">
						{#each detail.modul as m, i (m.kategori)}
							<li>
								<span>{m.kategori}</span>
								<span class="bar"><i style={`width:${(m.n / maksModul) * 100}%; background:${warnaDari(m.kategori)}; animation-delay:${i * 60}ms`}></i></span>
								<b>{m.n}</b>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="redup">Belum ada jejak aksi.</p>
				{/if}
			</div>
			<div>
				<h4>Metode Bayar POS · 30 hr</h4>
				{#if detail.metode.length}
					<Cincin data={detail.metode.map((/** @type {any} */ m) => ({ nama: m.metode, nilai: m.n, warna: warnaDari(m.metode) }))} judul={String(detail.metode.reduce((/** @type {number} */ s, /** @type {any} */ m) => s + m.n, 0))} sub="order" ukuran={130} tebal={12} />
				{:else}
					<p class="redup">Belum ada order POS.</p>
				{/if}
			</div>
		</div>

		<h4>Aksi Terakhir</h4>
		<ol class="aksi">
			{#each detail.aksi as a, i (i)}
				<li class={a.tipe}><span>{relatif(a.waktu)}</span>{a.pesan}</li>
			{:else}
				<li class="redup">Belum ada.</li>
			{/each}
		</ol>
	{/if}
</aside>

<style>
	.tirai {
		position: fixed;
		inset: 0;
		background: rgba(2, 4, 10, 0.55);
		backdrop-filter: blur(3px);
		z-index: 40;
	}
	.laci {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(480px, 100vw);
		overflow-y: auto;
		z-index: 41;
		padding: 22px 20px 40px;
		background: linear-gradient(180deg, #0b1226, #070b18);
		border-left: 1px solid rgba(62, 240, 208, 0.25);
		box-shadow: -30px 0 60px rgba(0, 0, 0, 0.5);
	}
	header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 14px;
		align-items: center;
	}
	.planet {
		width: 46px;
		height: 46px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff, var(--w) 40%, #05070f);
		box-shadow: 0 0 24px color-mix(in srgb, var(--w) 55%, transparent);
		animation: napas 4s ease-in-out infinite;
	}
	h3 {
		margin: 2px 0;
		font: 700 20px var(--f-tampil, sans-serif);
		color: #fff;
	}
	header small {
		color: #8a96b8;
		font-size: 11px;
	}
	.tutup {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		border: 1px solid rgba(140, 170, 255, 0.25);
		background: none;
		color: #fff;
		cursor: pointer;
	}
	.ringkas {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin: 18px 0 6px;
	}
	.ringkas span {
		display: grid;
		gap: 2px;
		padding: 10px;
		border-radius: 12px;
		background: rgba(140, 170, 255, 0.05);
		font-size: 10.5px;
		color: #8a96b8;
	}
	.ringkas b {
		font: 700 15px var(--f-mono, monospace);
		color: #fff;
	}
	h4 {
		margin: 22px 0 10px;
		font-size: 10.5px;
		letter-spacing: 1.6px;
		text-transform: uppercase;
		color: #8a96b8;
		font-weight: 600;
	}
	.dua {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.modul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 7px;
		font-size: 11.5px;
	}
	.modul li {
		display: grid;
		grid-template-columns: 74px 1fr 30px;
		gap: 8px;
		align-items: center;
		color: #b9c3e3;
	}
	.modul li span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.modul .bar {
		height: 6px;
		border-radius: 99px;
		background: rgba(140, 170, 255, 0.08);
		overflow: hidden;
	}
	.modul .bar i {
		display: block;
		height: 100%;
		border-radius: 99px;
		transform-origin: left;
		animation: lebar 0.8s cubic-bezier(0.3, 1, 0.4, 1) both;
	}
	.modul b {
		font-family: var(--f-mono, monospace);
		text-align: right;
		color: #fff;
	}
	.aksi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
		font-size: 12px;
		color: #d5ddf7;
	}
	.aksi li {
		padding: 8px 10px;
		border-radius: 10px;
		background: rgba(140, 170, 255, 0.04);
		border-left: 2px solid #3ef0d0;
	}
	.aksi li.error {
		border-left-color: #ff6b8a;
	}
	.aksi li.info {
		border-left-color: #5aa8ff;
	}
	.aksi li span {
		display: block;
		font: 10px var(--f-mono, monospace);
		color: #6f7ba0;
	}
	.redup {
		color: #6f7ba0;
		font-size: 12px;
	}
	.galat {
		color: #ff6b8a;
	}
	@keyframes napas {
		50% {
			transform: scale(1.06);
		}
	}
	@keyframes lebar {
		from {
			transform: scaleX(0);
		}
	}
	@media (max-width: 480px) {
		.dua {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.planet,
		.modul .bar i {
			animation: none;
		}
	}
</style>
