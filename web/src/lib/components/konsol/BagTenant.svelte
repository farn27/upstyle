<script>
	import Spark from './Spark.svelte';
	import Satelit from './Satelit.svelte';
	import { angka, rupiah, relatif, singkat, warnaDari } from './util.js';

	/** @type {{ data: any, pilihUnit: (u: any) => void }} */
	let { data, pilihUnit } = $props();
	let cari = $state('');
	let urut = $state('aktif');

	const daftar = $derived.by(() => {
		const q = cari.trim().toLowerCase();
		let xs = data.pengguna.filter(
			(/** @type {any} */ p) => !q || p.nama.toLowerCase().includes(q) || p.units.some((/** @type {any} */ u) => u.nama.toLowerCase().includes(q))
		);
		const skor = (/** @type {any} */ p) => p.units.reduce((/** @type {number} */ s, /** @type {any} */ u) => s + u.trx30 + u.pos30, 0);
		if (urut === 'aktif') xs = [...xs].sort((a, b) => String(b.akhir || '').localeCompare(String(a.akhir || '')));
		else if (urut === 'volume') xs = [...xs].sort((a, b) => skor(b) - skor(a));
		else if (urut === 'ai') xs = [...xs].sort((a, b) => b.aiToken30 - a.aiToken30);
		else xs = [...xs].sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));
		return xs;
	});
</script>

<div class="alat">
	<label class="cari">
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
		<input placeholder="Cari pemilik atau unit…" bind:value={cari} />
	</label>
	<div class="urut" role="group" aria-label="Urutkan">
		{#each [['aktif', 'Terakhir aktif'], ['volume', 'Volume'], ['ai', 'Pemakaian AI'], ['baru', 'Terbaru']] as [k, l] (k)}
			<button class:aktif={urut === k} onclick={() => (urut = k)}>{l}</button>
		{/each}
	</div>
	<span class="hitung">{daftar.length} pemilik · {daftar.reduce((/** @type {number} */ s, /** @type {any} */ p) => s + p.units.length, 0)} unit</span>
</div>

{#if daftar.length}
	<div class="rasi">
		{#each daftar as p, i (p.id)}
			<article class="kartu" style={`animation-delay:${Math.min(i, 12) * 60}ms`}>
				<header>
					<div class="avatar" style={`--w:${warnaDari(p.nama)}`}>{p.nama.slice(0, 1).toUpperCase()}</div>
					<div class="identitas">
						<b>{p.nama}</b>
						<small>{p.email} · {p.peran} · bergabung {String(p.dibuat).slice(0, 10)}</small>
					</div>
					<div class="status" class:hidup={p.units.some((/** @type {any} */ u) => u.aktif24)}>
						<i></i>{relatif(p.akhir)}
					</div>
				</header>
				<div class="metrik">
					<span><b>{p.units.length}</b> unit</span>
					<span><b>{singkat(p.aiToken30)}</b> token AI</span>
					<span><b>{angka(p.aiPermintaan30)}</b> permintaan AI</span>
				</div>
				{#if p.units.length}
					<ul class="unit">
						{#each p.units as u (u.id)}
							<li>
								<button type="button" onclick={() => pilihUnit(u)}>
									<span class="dot" style={`background:${warnaDari(u.kategori)}`} class:nyala={u.aktif24}></span>
									<span class="nm">
										<b>{u.nama}</b>
										<small>{u.kategori}{u.cabang ? ' · cabang' : ''} · {u.produk} produk{u.menipis ? ` · ${u.menipis} menipis` : ''}</small>
									</span>
									<Spark nilai={u.spark} warna={warnaDari(u.kategori)} lebar={96} tinggi={28} />
									<span class="angka">
										<b>{angka(u.trx30 + u.pos30)}</b>
										<small>{rupiah(u.omzetPos30)}</small>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="kosong">Belum membuat unit bisnis.</p>
				{/if}
			</article>
		{/each}
	</div>
{:else}
	<Satelit teks="Tidak ada tenant yang cocok." />
{/if}

<style>
	.alat {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		margin-bottom: 16px;
	}
	.cari {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1 1 240px;
		padding: 9px 12px;
		border-radius: 12px;
		background: var(--kolom-bg);
		border: 1px solid rgb(var(--kisi-rgb) / 0.16);
	}
	.cari svg {
		fill: none;
		stroke: var(--redup);
		stroke-width: 2;
	}
	.cari input {
		flex: 1;
		background: none;
		border: 0;
		outline: none;
		color: var(--kuat);
		font: inherit;
	}
	.urut {
		display: flex;
		gap: 4px;
		padding: 3px;
		border-radius: 12px;
		background: var(--kolom-bg);
		border: 1px solid rgb(var(--kisi-rgb) / 0.12);
	}
	.urut button {
		border: 0;
		background: none;
		color: var(--redup);
		padding: 6px 12px;
		border-radius: 9px;
		font: 600 12px var(--f-tampil, sans-serif);
		cursor: pointer;
	}
	.urut button.aktif {
		background: rgb(var(--aksen-rgb) / 0.15);
		color: var(--aksen);
	}
	.hitung {
		font: 11.5px var(--f-mono, monospace);
		color: var(--redup-2);
	}
	.rasi {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
		gap: 16px;
	}
	.kartu {
		padding: 16px;
		border-radius: 16px;
		background: var(--kartu-bg);
		border: 1px solid rgb(var(--kisi-rgb) / 0.12);
		animation: naik 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) both;
	}
	header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 12px;
		align-items: center;
	}
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		font: 700 17px var(--f-tampil, sans-serif);
		color: #05070f;
		background: var(--w);
		box-shadow: 0 0 18px color-mix(in srgb, var(--w) 45%, transparent);
	}
	.identitas {
		min-width: 0;
	}
	.identitas b {
		display: block;
		color: var(--kuat);
		font-size: 14.5px;
	}
	.identitas small {
		color: var(--redup-2);
		font-size: 11px;
	}
	.status {
		font-size: 11px;
		color: var(--redup);
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}
	.status i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--redup-2);
	}
	.status.hidup i {
		background: var(--aksen);
		box-shadow: 0 0 8px var(--aksen);
	}
	.metrik {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		margin: 12px 0 10px;
		font-size: 11.5px;
		color: var(--redup);
	}
	.metrik b {
		color: var(--teks);
		font-family: var(--f-mono, monospace);
	}
	.unit {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.unit button {
		width: 100%;
		display: grid;
		grid-template-columns: 10px minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: center;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid transparent;
		background: rgb(var(--kisi-rgb) / 0.04);
		color: inherit;
		text-align: left;
		cursor: pointer;
		font: inherit;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.unit button:hover {
		border-color: rgb(var(--aksen-rgb) / 0.35);
		background: rgb(var(--aksen-rgb) / 0.06);
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
	}
	.dot.nyala {
		box-shadow: 0 0 0 3px rgb(var(--aksen-rgb) / 0.18);
	}
	.nm {
		min-width: 0;
	}
	.nm b {
		display: block;
		font-size: 13px;
		color: var(--kuat);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.nm small {
		font-size: 10.5px;
		color: var(--redup-2);
	}
	.angka {
		text-align: right;
		display: grid;
	}
	.angka b {
		font: 700 13px var(--f-mono, monospace);
		color: var(--kuat);
	}
	.angka small {
		font-size: 10.5px;
		color: var(--redup);
	}
	.kosong {
		color: var(--redup-2);
		font-size: 12px;
		margin: 6px 0 0;
	}
	@keyframes naik {
		from {
			opacity: 0;
			transform: translateY(16px) scale(0.98);
		}
	}
	@media (max-width: 520px) {
		.unit button {
			grid-template-columns: 10px minmax(0, 1fr) auto;
		}
		.unit button :global(svg) {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.kartu {
			animation: none;
		}
	}
</style>
