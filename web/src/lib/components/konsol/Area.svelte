<script>
	/** Grafik area bertumpuk dengan garis bidik saat disentuh. */
	import { kurva, singkat } from './util.js';

	/**
	 * @type {{
	 *  label: string[],
	 *  seri: { nama: string, warna: string, nilai: number[] }[],
	 *  tinggi?: number,
	 *  format?: (n: number) => string,
	 *  bertumpuk?: boolean
	 * }}
	 */
	let { label = [], seri = [], tinggi = 220, format = singkat, bertumpuk = true } = $props();

	let W = $state(900);
	const ATAS = 14;
	const BAWAH = 26;
	let hover = $state(-1);
	const uid = Math.random().toString(36).slice(2, 8);

	const geo = $derived.by(() => {
		const n = label.length || 1;
		const tumpuk = seri.map(() => /** @type {number[]} */ ([]));
		for (let i = 0; i < n; i++) {
			let a = 0;
			seri.forEach((s, k) => {
				a = (bertumpuk ? a : 0) + (s.nilai[i] || 0);
				tumpuk[k][i] = a;
			});
		}
		const maks = Math.max(1, ...tumpuk.flat());
		const x = (/** @type {number} */ i) => 8 + (i * (W - 16)) / Math.max(1, n - 1);
		const y = (/** @type {number} */ v) => tinggi - BAWAH - (v / maks) * (tinggi - ATAS - BAWAH);
		const lapis = seri.map((s, k) => {
			const atas = /** @type {Array<[number, number]>} */ (tumpuk[k].map((v, i) => [x(i), y(v)]));
			const bawah =
				bertumpuk && k > 0
					? /** @type {Array<[number, number]>} */ (tumpuk[k - 1].map((v, i) => [x(i), y(v)])).reverse()
					: /** @type {Array<[number, number]>} */ ([
							[x(n - 1), y(0)],
							[x(0), y(0)]
						]);
			const garis = kurva(atas);
			const kembali = bertumpuk && k > 0 ? kurva(bawah).replace(/^M/, 'L') : `L${bawah[0][0]},${bawah[0][1]} L${bawah[1][0]},${bawah[1][1]}`;
			return { ...s, garis, isi: `${garis} ${kembali} Z` };
		});
		const sumbuY = [0, 0.5, 1].map((f) => ({ v: maks * f, y: y(maks * f) }));
		return { n, x, y, lapis, sumbuY, maks };
	});

	const langkah = $derived(Math.max(1, Math.ceil(label.length / 8)));

	/** @param {PointerEvent} e */
	function gerak(e) {
		const r = /** @type {SVGElement} */ (e.currentTarget).getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * W;
		hover = Math.max(0, Math.min(geo.n - 1, Math.round(((px - 8) / (W - 16)) * (geo.n - 1))));
	}
</script>

<div class="area" bind:clientWidth={W}>
	<svg viewBox={`0 0 ${W} ${tinggi}`} style={`height:${tinggi}px`} onpointermove={gerak} onpointerleave={() => (hover = -1)} role="img">
		<defs>
			{#each geo.lapis as l, k (l.nama)}
				<linearGradient id={`ar-${uid}-${k}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={l.warna} stop-opacity="0.55" />
					<stop offset="100%" stop-color={l.warna} stop-opacity="0.04" />
				</linearGradient>
			{/each}
		</defs>
		{#each geo.sumbuY as s (s.v)}
			<line x1="0" x2={W} y1={s.y} y2={s.y} class="kisi" />
		{/each}
		{#each geo.lapis as l, k (l.nama)}
			<path d={l.isi} fill={`url(#ar-${uid}-${k})`} class="isi" style={`animation-delay:${k * 120}ms`} />
			<path d={l.garis} stroke={l.warna} class="garis" pathLength="1" style={`animation-delay:${k * 120}ms`} />
		{/each}
		{#if hover >= 0}
			<line x1={geo.x(hover)} x2={geo.x(hover)} y1={ATAS} y2={tinggi - BAWAH} class="silang" />
		{/if}
		{#each label as l, i (i)}
			{#if i % langkah === 0 || i === label.length - 1}
				<text x={geo.x(i)} y={tinggi - 6} class="sumbu">{l}</text>
			{/if}
		{/each}
	</svg>
	<div class="sumbu-y">
		{#each geo.sumbuY as s (s.v)}
			<span style={`top:${(s.y / tinggi) * 100}%`}>{format(s.v)}</span>
		{/each}
	</div>
	{#if hover >= 0}
		<div class="info" style={`left:${(geo.x(hover) / W) * 100}%`}>
			<b>{label[hover]}</b>
			{#each seri as s (s.nama)}
				<span><i style={`background:${s.warna}`}></i>{s.nama}: {format(s.nilai[hover] || 0)}</span>
			{/each}
		</div>
	{/if}
	<div class="kunci">
		{#each seri as s (s.nama)}
			<span><i style={`background:${s.warna}`}></i>{s.nama}</span>
		{/each}
	</div>
</div>

<style>
	.area {
		position: relative;
	}
	svg {
		width: 100%;
		display: block;
		touch-action: pan-y;
	}
	.kisi {
		stroke: rgb(var(--kisi-rgb) / 0.08);
		stroke-dasharray: 2 6;
		vector-effect: non-scaling-stroke;
	}
	.isi {
		opacity: 0;
		animation: muncul 1.1s ease forwards;
	}
	.garis {
		fill: none;
		stroke-width: 2;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: tarik 1.6s cubic-bezier(0.6, 0, 0.2, 1) forwards;
	}
	.silang {
		stroke: rgb(var(--kontras-rgb) / 0.35);
		stroke-dasharray: 3 3;
		vector-effect: non-scaling-stroke;
	}
	.sumbu {
		fill: var(--redup);
		font: 10px var(--f-mono, monospace);
		text-anchor: middle;
	}
	.sumbu-y span {
		position: absolute;
		left: 4px;
		transform: translateY(-120%);
		font: 10px var(--f-mono, monospace);
		color: var(--redup-2);
		pointer-events: none;
	}
	.info {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		background: var(--tip-bg);
		border: 1px solid rgb(var(--ungu-rgb) / 0.35);
		border-radius: 8px;
		padding: 6px 10px;
		font-size: 11px;
		display: grid;
		gap: 1px;
		pointer-events: none;
		white-space: nowrap;
		z-index: 3;
	}
	.kunci {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		font-size: 11px;
		color: var(--redup);
		margin-top: 4px;
	}
	i {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
		margin-right: 6px;
	}
	@keyframes tarik {
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes muncul {
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.isi,
		.garis {
			animation: none;
			opacity: 1;
			stroke-dashoffset: 0;
		}
	}
</style>
