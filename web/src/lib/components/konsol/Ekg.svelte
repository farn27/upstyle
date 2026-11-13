<script>
	/**
	 * Denyut aktivitas 48 jam terakhir, digambar seperti rekaman jantung: garis menyala yang "ditarik",
	 * titik pemindai yang bergerak di sepanjang garis, dan batang tipis per jenis aktivitas di bawahnya.
	 */
	import { kurva } from './util.js';

	/** @type {{ data: { jam: string, trx: number, pos: number, aksi: number }[] }} */
	let { data = [] } = $props();

	let W = $state(900);
	const H = 210;
	const ATAS = 18;
	const BAWAH = 34;
	let hover = $state(-1);

	const geo = $derived.by(() => {
		const n = data.length || 1;
		const total = data.map((d) => d.trx + d.pos + d.aksi);
		const maks = Math.max(1, ...total);
		const x = (/** @type {number} */ i) => 10 + (i * (W - 20)) / Math.max(1, n - 1);
		const y = (/** @type {number} */ v) => H - BAWAH - (v / maks) * (H - ATAS - BAWAH);
		const titik = /** @type {Array<[number, number]>} */ (total.map((v, i) => [x(i), y(v)]));
		const garis = kurva(titik);
		const isi = garis ? `${garis} L${x(n - 1)},${H - BAWAH} L${x(0)},${H - BAWAH} Z` : '';
		const lebar = (W - 20) / n;
		return { n, maks, total, x, y, garis, isi, lebar, titik };
	});

	const label = $derived(data.map((d, i) => ({ i, teks: d.jam.slice(11, 13) + ':00', hari: d.jam.slice(8, 10) })).filter((_, i) => i % 6 === 0));

	/** @param {PointerEvent} e */
	function gerak(e) {
		const r = /** @type {SVGElement} */ (e.currentTarget).getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * W;
		hover = Math.max(0, Math.min(geo.n - 1, Math.round(((px - 10) / (W - 20)) * (geo.n - 1))));
	}
</script>

<div class="ekg" bind:clientWidth={W}>
	<svg viewBox={`0 0 ${W} ${H}`} onpointermove={gerak} onpointerleave={() => (hover = -1)} role="img" aria-label="Denyut aktivitas 48 jam terakhir">
		<defs>
			<linearGradient id="ekg-isi" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="rgba(62,240,208,0.28)" />
				<stop offset="100%" stop-color="rgba(62,240,208,0)" />
			</linearGradient>
			<linearGradient id="ekg-garis" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stop-color="#9b8cff" />
				<stop offset="60%" stop-color="#3ef0d0" />
				<stop offset="100%" stop-color="#b8fff2" />
			</linearGradient>
			<filter id="ekg-pendar" x="-10%" y="-50%" width="120%" height="200%">
				<feGaussianBlur stdDeviation="3.5" result="b" />
				<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
			</filter>
		</defs>

		<!-- kisi milimeter seperti kertas EKG -->
		{#each Array(9) as _, i (i)}
			<line x1="0" x2={W} y1={ATAS + (i * (H - ATAS - BAWAH)) / 8} y2={ATAS + (i * (H - ATAS - BAWAH)) / 8} class="kisi" />
		{/each}
		{#each Array(49) as _, i (i)}
			<line y1={ATAS} y2={H - BAWAH} x1={10 + (i * (W - 20)) / 48} x2={10 + (i * (W - 20)) / 48} class={i % 6 === 0 ? 'kisi tebal' : 'kisi'} />
		{/each}

		<!-- batang per jenis -->
		{#each data as d, i (d.jam)}
			{@const bx = geo.x(i) - geo.lebar * 0.3}
			{@const bw = Math.max(1, geo.lebar * 0.6)}
			{@const s = (H - ATAS - BAWAH) / geo.maks}
			<rect x={bx} width={bw} y={H - BAWAH - d.pos * s} height={d.pos * s} class="b-pos" />
			<rect x={bx} width={bw} y={H - BAWAH - (d.pos + d.trx) * s} height={d.trx * s} class="b-trx" />
			<rect x={bx} width={bw} y={H - BAWAH - (d.pos + d.trx + d.aksi) * s} height={d.aksi * s} class="b-aksi" />
		{/each}

		<path d={geo.isi} fill="url(#ekg-isi)" />
		{#key geo.garis}
			<path d={geo.garis} class="garis" stroke="url(#ekg-garis)" filter="url(#ekg-pendar)" pathLength="1" />
			{#if geo.garis}
				<circle r="4.5" class="pindai">
					<animateMotion dur="7s" repeatCount="indefinite" path={geo.garis} />
				</circle>
			{/if}
		{/key}

		{#if hover >= 0}
			<line x1={geo.x(hover)} x2={geo.x(hover)} y1={ATAS - 6} y2={H - BAWAH} class="silang" />
			<circle cx={geo.titik[hover][0]} cy={geo.titik[hover][1]} r="5" class="titik-hover" />
		{/if}

		{#each label as l (l.i)}
			<text x={geo.x(l.i)} y={H - 12} class="sumbu">{l.teks}</text>
			<text x={geo.x(l.i)} y={H - 1} class="sumbu redup">tgl {l.hari}</text>
		{/each}
	</svg>
	{#if hover >= 0}
		{@const d = data[hover]}
		<div class="info" style={`left:${(geo.x(hover) / W) * 100}%`}>
			<b>{d.jam.slice(8, 10)}/{d.jam.slice(5, 7)} · {d.jam.slice(11, 13)}:00</b>
			<span><i class="t-trx"></i>{d.trx} transaksi</span>
			<span><i class="t-pos"></i>{d.pos} order POS</span>
			<span><i class="t-aksi"></i>{d.aksi} aksi</span>
		</div>
	{/if}
	<div class="kunci">
		<span><i class="t-trx"></i>Transaksi</span><span><i class="t-pos"></i>Order POS</span><span><i class="t-aksi"></i>Aksi pengguna</span>
	</div>
</div>

<style>
	.ekg {
		position: relative;
	}
	svg {
		width: 100%;
		height: 210px;
		display: block;
		touch-action: pan-y;
	}
	.kisi {
		stroke: rgba(255, 107, 138, 0.06);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.kisi.tebal {
		stroke: rgba(255, 107, 138, 0.14);
	}
	.garis {
		fill: none;
		stroke-width: 2.4;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: tarik 2.2s cubic-bezier(0.6, 0, 0.2, 1) forwards;
	}
	.pindai {
		fill: #fff;
		filter: drop-shadow(0 0 6px #3ef0d0) drop-shadow(0 0 14px #3ef0d0);
	}
	.b-trx {
		fill: rgba(62, 240, 208, 0.22);
	}
	.b-pos {
		fill: rgba(155, 140, 255, 0.28);
	}
	.b-aksi {
		fill: rgba(255, 198, 92, 0.22);
	}
	.silang {
		stroke: rgba(255, 255, 255, 0.35);
		stroke-dasharray: 3 3;
		vector-effect: non-scaling-stroke;
	}
	.titik-hover {
		fill: #05070f;
		stroke: #3ef0d0;
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}
	.sumbu {
		fill: #8a96b8;
		font: 10px var(--f-mono, monospace);
		text-anchor: middle;
	}
	.sumbu.redup {
		fill: #5b6688;
		font-size: 8.5px;
	}
	.info {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		background: rgba(8, 12, 26, 0.92);
		border: 1px solid rgba(62, 240, 208, 0.3);
		border-radius: 8px;
		padding: 6px 10px;
		font-size: 11px;
		display: grid;
		gap: 1px;
		pointer-events: none;
		white-space: nowrap;
	}
	.kunci {
		display: flex;
		gap: 16px;
		justify-content: flex-end;
		font-size: 11px;
		color: #8a96b8;
	}
	i {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
		margin-right: 6px;
	}
	.t-trx {
		background: #3ef0d0;
	}
	.t-pos {
		background: #9b8cff;
	}
	.t-aksi {
		background: #ffc65c;
	}
	@keyframes tarik {
		to {
			stroke-dashoffset: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.garis {
			animation: none;
			stroke-dashoffset: 0;
		}
		.pindai {
			display: none;
		}
	}
</style>
