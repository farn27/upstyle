<script>
	/** Jam melingkar 24 jam: batang memancar dari pusat sesuai jumlah permintaan AI per jam (7 hari). */
	import { angka } from './util.js';

	/** @type {{ data: { jam: number, n: number, token: number }[] }} */
	let { data = [] } = $props();
	const S = 260;
	const C = S / 2;
	const R0 = 46;
	const R1 = 118;
	const jamKini = Number(new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 13));
	const sudutKini = ((jamKini / 24) * 360 - 90) * (Math.PI / 180);
	let sorot = $state(-1);

	const batang = $derived.by(() => {
		const maks = Math.max(1, ...data.map((d) => d.n));
		return data.map((d) => {
			const a = ((d.jam / 24) * 360 - 90) * (Math.PI / 180);
			const len = (d.n / maks) * (R1 - R0);
			return {
				...d,
				x1: C + R0 * Math.cos(a),
				y1: C + R0 * Math.sin(a),
				x2: C + (R0 + Math.max(2, len)) * Math.cos(a),
				y2: C + (R0 + Math.max(2, len)) * Math.sin(a)
			};
		});
	});
	const puncak = $derived(data.reduce((m, d) => (d.n > m.n ? d : m), { jam: 0, n: 0, token: 0 }));
	const tampil = $derived(sorot >= 0 ? data[sorot] : puncak);
</script>

<div class="jam">
	<svg viewBox={`-26 -26 ${S + 52} ${S + 52}`}>
		<defs>
			<linearGradient id="jam-g" x1="0" y1="1" x2="1" y2="0">
				<stop offset="0%" stop-color="#9b8cff" />
				<stop offset="100%" stop-color="#3ef0d0" />
			</linearGradient>
		</defs>
		<circle cx={C} cy={C} r={R1 + 6} class="tepi" />
		<circle cx={C} cy={C} r={R0 - 6} class="tepi dalam" />
		{#each Array(24) as _, h (h)}
			{@const a = ((h / 24) * 360 - 90) * (Math.PI / 180)}
			<line x1={C + (R1 + 2) * Math.cos(a)} y1={C + (R1 + 2) * Math.sin(a)} x2={C + (R1 + (h % 6 ? 6 : 11)) * Math.cos(a)} y2={C + (R1 + (h % 6 ? 6 : 11)) * Math.sin(a)} class="tik" />
		{/each}
		{#each [0, 6, 12, 18] as h (h)}
			{@const a = ((h / 24) * 360 - 90) * (Math.PI / 180)}
			<text x={C + (R1 + 22) * Math.cos(a)} y={C + (R1 + 22) * Math.sin(a) + 4} class="angka-jam">{String(h).padStart(2, '0')}</text>
		{/each}
		{#each batang as b, i (b.jam)}
			<line
				role="presentation"
				x1={b.x1}
				y1={b.y1}
				x2={b.x2}
				y2={b.y2}
				class="batang"
				class:kini={b.jam === jamKini}
				style={`animation-delay:${i * 35}ms`}
				onpointerenter={() => (sorot = i)}
				onpointerleave={() => (sorot = -1)}
			/>
		{/each}
		<!-- jarum jam sekarang -->
		<line x1={C} y1={C} x2={C + (R0 - 10) * Math.cos(sudutKini)} y2={C + (R0 - 10) * Math.sin(sudutKini)} class="jarum" />
		<circle cx={C} cy={C} r="4" fill="#3ef0d0" />
	</svg>
	<div class="ket">
		<b>{String(tampil.jam).padStart(2, '0')}:00</b>
		<span>{angka(tampil.n)} permintaan · {angka(tampil.token)} token</span>
		<small>{sorot >= 0 ? 'jam dipilih' : 'jam tersibuk (7 hari)'}</small>
	</div>
</div>

<style>
	.jam {
		display: grid;
		justify-items: center;
		gap: 6px;
	}
	svg {
		width: 100%;
		max-width: 300px;
		overflow: visible;
	}
	.tepi {
		fill: none;
		stroke: rgba(140, 170, 255, 0.12);
	}
	.tepi.dalam {
		stroke-dasharray: 2 4;
	}
	.tik {
		stroke: rgba(140, 170, 255, 0.35);
	}
	.angka-jam {
		fill: #8a96b8;
		font: 10px var(--f-mono, monospace);
		text-anchor: middle;
	}
	.batang {
		stroke: #6fd9ff;
		stroke-width: 7;
		stroke-linecap: round;
		opacity: 0.85;
		cursor: pointer;
		transform-origin: 130px 130px;
		animation: mekar 0.9s cubic-bezier(0.3, 1.4, 0.5, 1) both;
	}
	.batang:hover {
		stroke: #fff;
	}
	.batang.kini {
		stroke: #ffc65c;
		filter: drop-shadow(0 0 6px #ffc65c);
	}
	.jarum {
		stroke: #ffc65c;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.ket {
		text-align: center;
		display: grid;
	}
	.ket b {
		font: 700 20px var(--f-mono, monospace);
	}
	.ket span {
		font-size: 12px;
		color: #b9c3e3;
	}
	.ket small {
		font-size: 10px;
		color: #5b6688;
		text-transform: uppercase;
		letter-spacing: 1.5px;
	}
	@keyframes mekar {
		from {
			transform: scale(0.35);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.batang {
			animation: none;
		}
	}
</style>
