<script>
	import Topologi from './Topologi.svelte';
	import Treemap from './Treemap.svelte';
	import Terminal from './Terminal.svelte';
	import Cincin from './Cincin.svelte';
	import { durasi, WARNA } from './util.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const rt = $derived(data.runtime);
	const maksGalat = $derived(Math.max(1, ...data.galatPerJam.map((/** @type {any} */ g) => g.error + g.warn)));
</script>

<div class="kisi-2">
	<section class="panel">
		<header class="judul-panel"><span>Topologi Layanan</span><small>diperiksa langsung saat dimuat</small></header>
		<Topologi layanan={data.layanan} />
	</section>
	<section class="panel">
		<header class="judul-panel"><span>Mesin</span><small>instans server yang menjawab permintaan ini</small></header>
		<div class="mesin">
			<Cincin nilai={rt.memoriMB.heap} maks={Math.max(rt.memoriMB.heapTotal, 256)} judul={`${rt.memoriMB.heap} MB`} sub="heap" ukuran={150} warna={WARNA.ungu} />
			<dl>
				<dt>Lingkungan</dt><dd><span class="lencana">{rt.lingkungan}</span> · {rt.wilayah}</dd>
				<dt>Versi live</dt><dd>{rt.commit ? `${rt.commit}${rt.cabang ? ` (${rt.cabang})` : ''}` : 'lokal / tidak diketahui'}</dd>
				{#if rt.pesanCommit}<dt>Commit</dt><dd class="redup">{rt.pesanCommit}</dd>{/if}
				<dt>Node</dt><dd>{rt.node} · {rt.platform}</dd>
				<dt>Hidup</dt><dd>{durasi(rt.uptimeDetik)} · RSS {rt.memoriMB.rss} MB</dd>
				<dt>MySQL</dt><dd>{data.layanan.db.versi || '–'}</dd>
			</dl>
		</div>
		<h4 class="sub-judul">Konfigurasi</h4>
		<div class="env">
			{#each data.konfigurasi as k (k.kunci)}
				<span class="env-item" class:ada={k.ada} title={k.kunci}><i></i>{k.label}</span>
			{/each}
		</div>
	</section>
</div>

<section class="panel">
	<header class="judul-panel"><span>Galat per Jam · 24 Jam</span><small>error (merah) & peringatan (kuning) dari server dan AI</small></header>
	<div class="batang-galat">
		{#each data.galatPerJam as g, i (g.jam)}
			<div class="kolom" title={`${g.jam.slice(11, 13)}:00 — ${g.error} error, ${g.warn} peringatan`}>
				<span class="w" style={`height:${(g.warn / maksGalat) * 100}%; animation-delay:${i * 20}ms`}></span>
				<span class="e" style={`height:${(g.error / maksGalat) * 100}%; animation-delay:${i * 20}ms`}></span>
				<small>{i % 3 === 0 ? g.jam.slice(11, 13) : ''}</small>
			</div>
		{/each}
	</div>
	<Terminal baris={data.galat} />
</section>

<section class="panel">
	<header class="judul-panel"><span>Peta Basis Data</span><small>ukuran tabel (data + indeks)</small></header>
	<Treemap data={data.tabel} />
</section>

<style>
	.mesin {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 18px;
		align-items: center;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 14px;
		margin: 0;
		font-size: 12.5px;
	}
	dt {
		color: var(--redup);
	}
	dd {
		margin: 0;
		color: var(--teks);
		font-family: var(--f-mono, monospace);
		font-size: 12px;
		overflow-wrap: anywhere;
	}
	.redup {
		color: var(--teks-2);
	}
	.lencana {
		padding: 1px 8px;
		border-radius: 99px;
		background: rgb(var(--aksen-rgb) / 0.12);
		color: var(--aksen);
	}
	.sub-judul {
		margin: 18px 0 8px;
		font-size: 10.5px;
		letter-spacing: 1.6px;
		text-transform: uppercase;
		color: var(--redup);
		font-weight: 600;
	}
	.env {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.env-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 99px;
		font-size: 11.5px;
		border: 1px solid rgb(var(--mawar-rgb) / 0.3);
		color: var(--mawar-teks);
	}
	.env-item i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--mawar);
	}
	.env-item.ada {
		border-color: rgb(var(--aksen-rgb) / 0.3);
		color: var(--aksen-teks);
	}
	.env-item.ada i {
		background: var(--aksen);
	}
	.batang-galat {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		gap: 4px;
		height: 110px;
		align-items: end;
		margin-bottom: 14px;
	}
	.kolom {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		position: relative;
		background: rgb(var(--kisi-rgb) / 0.04);
		border-radius: 4px;
		padding-bottom: 14px;
	}
	.kolom span {
		display: block;
		border-radius: 3px;
		transform-origin: bottom;
		animation: tumbuh 0.7s cubic-bezier(0.3, 1.3, 0.5, 1) both;
	}
	.kolom .e {
		background: linear-gradient(var(--mawar), #b03b5c);
		box-shadow: 0 0 10px rgb(var(--mawar-rgb) / 0.5);
	}
	.kolom .w {
		background: linear-gradient(var(--amber), #b88a2c);
	}
	.kolom small {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		text-align: center;
		font: 9px var(--f-mono, monospace);
		color: var(--redup-2);
	}
	@keyframes tumbuh {
		from {
			transform: scaleY(0);
		}
	}
	@media (max-width: 640px) {
		.mesin {
			grid-template-columns: 1fr;
			justify-items: center;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.kolom span {
			animation: none;
		}
	}
</style>
