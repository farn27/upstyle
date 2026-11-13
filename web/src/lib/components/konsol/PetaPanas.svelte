<script>
	/** Peta panas hari × jam (7 × 24). Sel muncul bergelombang dari kiri atas. */
	/** @type {{ data: number[][] }} */
	let { data = [] } = $props();
	const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
	const maks = $derived(Math.max(1, ...data.flat()));
	let sorot = $state(/** @type {{ h: number, j: number } | null} */ (null));

	/** @param {number} v */
	function warna(v) {
		const t = v / maks;
		if (!v) return 'rgba(140,170,255,0.05)';
		// aqua → ungu → amber
		const c = t < 0.5 ? [62 + (155 - 62) * t * 2, 240 - (240 - 140) * t * 2, 208 + (255 - 208) * t * 2] : [155 + (255 - 155) * (t - 0.5) * 2, 140 + (198 - 140) * (t - 0.5) * 2, 255 - (255 - 92) * (t - 0.5) * 2];
		return `rgba(${c.map(Math.round).join(',')},${0.25 + t * 0.75})`;
	}
</script>

<div class="panas">
	<div class="kisi">
		<span></span>
		{#each Array(24) as _, j (j)}
			<span class="kepala">{j % 3 === 0 ? String(j).padStart(2, '0') : ''}</span>
		{/each}
		{#each data as baris, h (h)}
			<span class="hari">{HARI[h]}</span>
			{#each baris as v, j (j)}
				<button
					type="button"
					class="sel"
					style={`background:${warna(v)}; animation-delay:${(h + j) * 14}ms`}
					aria-label={`${HARI[h]} ${j}:00 — ${v} aktivitas`}
					onpointerenter={() => (sorot = { h, j })}
					onpointerleave={() => (sorot = null)}
					onfocus={() => (sorot = { h, j })}
				></button>
			{/each}
		{/each}
	</div>
	<p class="ket">
		{#if sorot}
			<b>{HARI[sorot.h]} {String(sorot.j).padStart(2, '0')}:00</b> — {data[sorot.h][sorot.j]} aktivitas (90 hari)
		{:else}
			Aktivitas transaksi + order POS per jam dalam 90 hari. Arahkan ke sel untuk detail.
		{/if}
	</p>
</div>

<style>
	.kisi {
		display: grid;
		grid-template-columns: 30px repeat(24, minmax(0, 1fr));
		gap: 3px;
	}
	.kepala {
		font: 9px var(--f-mono, monospace);
		color: var(--redup-2);
		text-align: left;
	}
	.hari {
		font-size: 10px;
		color: var(--redup);
		align-self: center;
	}
	.sel {
		aspect-ratio: 1;
		border: 0;
		padding: 0;
		border-radius: 3px;
		cursor: crosshair;
		animation: timbul 0.5s ease both;
	}
	.sel:hover,
	.sel:focus-visible {
		outline: 1.5px solid var(--kuat);
		outline-offset: 1px;
	}
	.ket {
		font-size: 11.5px;
		color: var(--redup);
		margin: 8px 0 0;
		min-height: 1.4em;
	}
	@keyframes timbul {
		from {
			opacity: 0;
			transform: scale(0.3);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sel {
			animation: none;
		}
	}
</style>
