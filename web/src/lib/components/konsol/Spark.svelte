<script>
	/** Sparkline mungil dengan isi gradien. */
	import { kurva } from './util.js';
	/** @type {{ nilai: number[], warna?: string, lebar?: number, tinggi?: number }} */
	let { nilai = [], warna = '#3ef0d0', lebar = 120, tinggi = 30 } = $props();
	const id = 'sp' + Math.random().toString(36).slice(2, 8);
	const d = $derived.by(() => {
		const m = Math.max(1, ...nilai);
		const p = /** @type {Array<[number, number]>} */ (nilai.map((v, i) => [2 + (i * (lebar - 4)) / Math.max(1, nilai.length - 1), tinggi - 3 - (v / m) * (tinggi - 6)]));
		const g = kurva(p);
		return { g, isi: g ? `${g} L${lebar - 2},${tinggi} L2,${tinggi} Z` : '' };
	});
</script>

<svg width={lebar} height={tinggi} viewBox={`0 0 ${lebar} ${tinggi}`} aria-hidden="true">
	<defs>
		<linearGradient {id} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color={warna} stop-opacity="0.4" />
			<stop offset="100%" stop-color={warna} stop-opacity="0" />
		</linearGradient>
	</defs>
	<path d={d.isi} fill={`url(#${id})`} />
	<path d={d.g} fill="none" stroke={warna} stroke-width="1.6" />
</svg>
