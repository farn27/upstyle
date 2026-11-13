<script>
	import Satelit from './Satelit.svelte';
	import { relatif } from './util.js';
	/** @type {{ data: any }} */
	let { data } = $props();
</script>

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
		<header class="judul-panel"><span>Aksi Pengguna Terbaru</span><small>riwayat_aksi seluruh tenant</small></header>
		{#if data.aksi.length}
			<ol class="garis-waktu">
				{#each data.aksi as a, i (a.id)}
					<li class={a.tipe} style={`animation-delay:${Math.min(i, 15) * 40}ms`}>
						<span class="simpul"></span>
						<div>
							<b>{a.pesan}</b>
							<small><span class="tag">{a.kategori || 'umum'}</span> {a.unit} · {a.oleh} · {relatif(a.waktu)}</small>
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
	li {
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
	li.error .simpul {
		border-color: var(--mawar);
	}
	li.info .simpul {
		border-color: var(--biru);
	}
	b {
		display: block;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--teks);
		line-height: 1.4;
	}
	small {
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
		.dua {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		li {
			animation: none;
		}
	}
</style>
