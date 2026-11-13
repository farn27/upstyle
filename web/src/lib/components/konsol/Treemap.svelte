<script>
	/** Peta ukuran tabel basis data (squarified treemap). Kotak tumbuh dari tengahnya saat muncul. */
	import { treemap, ukuranBerkas, angka, PALET } from './util.js';
	/** @type {{ data: { nama: string, baris: number, ukuran: number }[] }} */
	let { data = [] } = $props();
	let W = $state(900);
	const H = 300;
	const kotak = $derived(treemap(data.slice(0, 24).map((d) => ({ ...d, nilai: d.ukuran })), W, H));
	const total = $derived(data.reduce((s, d) => s + d.ukuran, 0));
	let sorot = $state(/** @type {any} */ (null));
</script>

<div class="tm" bind:clientWidth={W}>
	<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ukuran tabel basis data">
		{#each kotak as k, i (k.nama)}
			<g class="kotak" style={`animation-delay:${i * 40}ms`} role="presentation" onpointerenter={() => (sorot = k)} onpointerleave={() => (sorot = null)}>
				<rect x={k.x + 1.5} y={k.y + 1.5} width={Math.max(0, k.w - 3)} height={Math.max(0, k.h - 3)} rx="6" fill={PALET[i % PALET.length]} fill-opacity={0.12 + 0.5 * (k.nilai / (kotak[0]?.nilai || 1))} stroke={PALET[i % PALET.length]} stroke-opacity="0.6" />
				{#if k.w > 70 && k.h > 30}
					<text x={k.x + 10} y={k.y + 20} class="nama">{k.nama}</text>
					<text x={k.x + 10} y={k.y + 35} class="ukur">{ukuranBerkas(k.ukuran)}</text>
				{/if}
			</g>
		{/each}
	</svg>
	<p class="ket">
		{#if sorot}
			<b>{sorot.nama}</b> · {ukuranBerkas(sorot.ukuran)} · ±{angka(sorot.baris)} baris
		{:else}
			Total {ukuranBerkas(total)} di {data.length} tabel terbesar. Arahkan ke kotak untuk detail.
		{/if}
	</p>
</div>

<style>
	svg {
		width: 100%;
		height: 300px;
		display: block;
	}
	.kotak {
		transform-box: fill-box;
		transform-origin: center;
		animation: tumbuh 0.7s cubic-bezier(0.3, 1.3, 0.5, 1) both;
		cursor: default;
	}
	.kotak:hover rect {
		stroke-opacity: 1;
		stroke-width: 2;
	}
	.nama {
		fill: #fff;
		font: 600 12px var(--f-mono, monospace);
	}
	.ukur {
		fill: rgba(255, 255, 255, 0.65);
		font: 10.5px var(--f-mono, monospace);
	}
	.ket {
		font-size: 11.5px;
		color: #8a96b8;
		margin: 8px 0 0;
	}
	@keyframes tumbuh {
		from {
			transform: scale(0.2);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.kotak {
			animation: none;
		}
	}
</style>
