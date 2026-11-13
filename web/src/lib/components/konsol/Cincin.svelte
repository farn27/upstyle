<script>
	/**
	 * Cincin donat (bagian) atau pengukur (satu nilai terhadap batas). Busur "tumbuh" saat muncul.
	 * mode "donat": data = [{ nama, nilai, warna }]; mode "ukur": nilai & maks.
	 */
	/**
	 * @type {{
	 *  data?: { nama: string, nilai: number, warna: string }[],
	 *  nilai?: number, maks?: number, warna?: string,
	 *  ukuran?: number, tebal?: number, judul?: string, sub?: string
	 * }}
	 */
	let { data = [], nilai = 0, maks = 100, warna = '#3ef0d0', ukuran = 168, tebal = 14, judul = '', sub = '' } = $props();

	const R = $derived((ukuran - tebal) / 2 - 4);
	const K = $derived(2 * Math.PI * R);
	const busur = $derived.by(() => {
		if (data.length) {
			const total = data.reduce((s, d) => s + d.nilai, 0) || 1;
			let a = 0;
			return data.map((d) => {
				const p = d.nilai / total;
				const r = { ...d, p, panjang: Math.max(0, p * K - 3), awal: a * K };
				a += p;
				return r;
			});
		}
		const p = Math.max(0, Math.min(1, maks ? nilai / maks : 0));
		return [{ nama: 'nilai', nilai, warna: p > 0.9 ? '#ff6b8a' : p > 0.7 ? '#ffc65c' : warna, p, panjang: p * K * 0.75, awal: 0 }];
	});
	const ukurMode = $derived(!data.length);
</script>

<div class="cincin" style={`width:${ukuran}px`}>
	<svg viewBox={`0 0 ${ukuran} ${ukuran}`} width={ukuran} height={ukuran}>
		<g transform={`rotate(${ukurMode ? 135 : -90} ${ukuran / 2} ${ukuran / 2})`}>
			<circle cx={ukuran / 2} cy={ukuran / 2} r={R} class="jalur" stroke-width={tebal} stroke-dasharray={ukurMode ? `${K * 0.75} ${K}` : undefined} />
			{#each busur as b, i (b.nama)}
				<circle
					cx={ukuran / 2}
					cy={ukuran / 2}
					r={R}
					class="busur"
					stroke={b.warna}
					stroke-width={tebal}
					stroke-dasharray={`${b.panjang} ${K}`}
					stroke-dashoffset={-b.awal}
					style={`--k:${K}; animation-delay:${i * 90}ms`}
				/>
			{/each}
		</g>
	</svg>
	<div class="tengah">
		<b>{judul}</b>
		{#if sub}<span>{sub}</span>{/if}
	</div>
</div>
{#if data.length}
	<ul class="legenda">
		{#each busur as b (b.nama)}
			<li><i style={`background:${b.warna}`}></i><span class="nama">{b.nama}</span><span class="pct">{Math.round(b.p * 100)}%</span></li>
		{/each}
	</ul>
{/if}

<style>
	.cincin {
		position: relative;
		margin: 0 auto;
	}
	svg {
		display: block;
	}
	.jalur {
		fill: none;
		stroke: rgba(140, 170, 255, 0.09);
		stroke-linecap: round;
	}
	.busur {
		fill: none;
		stroke-linecap: butt;
		filter: drop-shadow(0 0 6px currentColor);
		animation: tumbuh 1.2s cubic-bezier(0.6, 0, 0.2, 1) both;
	}
	.tengah {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		text-align: center;
	}
	.tengah b {
		font: 700 22px var(--f-mono, monospace);
		color: #fff;
	}
	.tengah span {
		font-size: 10px;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: #8a96b8;
	}
	.legenda {
		list-style: none;
		padding: 0;
		margin: 10px 0 0;
		display: grid;
		gap: 4px;
		font-size: 11.5px;
	}
	.legenda li {
		display: grid;
		grid-template-columns: 12px 1fr auto;
		align-items: center;
		gap: 6px;
		color: #b9c3e3;
	}
	.legenda i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.nama {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pct {
		font-family: var(--f-mono, monospace);
		color: #fff;
	}
	@keyframes tumbuh {
		from {
			stroke-dasharray: 0 var(--k);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.busur {
			animation: none;
		}
	}
</style>
