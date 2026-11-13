<script>
	/**
	 * Topologi layanan: fungsi server di tengah, terhubung ke MySQL, Redis, Socket.io, dan Groq.
	 * Partikel data mengalir di sepanjang kabel; kabel memerah bila layanan gagal. Radar menyapu di belakang.
	 */
	/** @type {{ layanan: Record<string, { ok: boolean, ms: number, galat?: string, [k: string]: any }> }} */
	let { layanan } = $props();

	const C = { x: 300, y: 190 };
	const SIMPUL = [
		{ kunci: 'db', nama: 'MySQL', sub: 'basis data', x: 92, y: 96, ikon: 'db' },
		{ kunci: 'redis', nama: 'Redis', sub: 'cache · kuota · sesi', x: 508, y: 96, ikon: 'kilat' },
		{ kunci: 'socket', nama: 'Socket.io', sub: 'realtime (VPS)', x: 92, y: 290, ikon: 'gelombang' },
		{ kunci: 'groq', nama: 'Groq AI', sub: 'model bahasa', x: 508, y: 290, ikon: 'neuron' }
	];

	/** @param {any} s */
	const status = (s) => (!s ? 'mati' : s.ok ? (s.ms > 800 ? 'lambat' : 'sehat') : 'mati');
	/** @param {{ x: number, y: number }} a */
	const jalur = (a) => {
		const mx = (a.x + C.x) / 2;
		return `M${C.x},${C.y} C${mx},${C.y} ${mx},${a.y} ${a.x},${a.y}`;
	};
</script>

<div class="topo">
	<svg viewBox="0 0 600 380" role="img" aria-label="Topologi layanan">
		<defs>
			<radialGradient id="tp-radar" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="rgba(62,240,208,0.18)" />
				<stop offset="100%" stop-color="rgba(62,240,208,0)" />
			</radialGradient>
			<linearGradient id="tp-sapu" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stop-color="rgba(62,240,208,0)" />
				<stop offset="100%" stop-color="rgba(62,240,208,0.35)" />
			</linearGradient>
		</defs>

		<!-- radar -->
		<circle cx={C.x} cy={C.y} r="150" fill="url(#tp-radar)" />
		{#each [50, 100, 150] as r (r)}
			<circle cx={C.x} cy={C.y} {r} class="radar-cincin" />
		{/each}
		<g class="sapu"><path d={`M${C.x},${C.y} L${C.x + 150},${C.y} A150,150 0 0,0 ${C.x + 150 * Math.cos(-0.6)},${C.y + 150 * Math.sin(-0.6)} Z`} fill="url(#tp-sapu)" /></g>

		<!-- kabel + partikel -->
		{#each SIMPUL as s, i (s.kunci)}
			{@const st = status(layanan?.[s.kunci])}
			{@const d = jalur(s)}
			<path {d} class={`kabel ${st}`} />
			<path {d} class={`aliran ${st}`} style={`animation-duration:${1.2 + i * 0.25}s`} />
			{#if st !== 'mati'}
				{#each [0, 1, 2] as k (k)}
					<circle r="2.6" class={`partikel ${st}`}>
						<animateMotion dur={`${2.2 + i * 0.3}s`} begin={`${k * 0.75}s`} repeatCount="indefinite" path={d} keyPoints={i % 2 ? '0;1' : '1;0'} keyTimes="0;1" calcMode="linear" />
					</circle>
				{/each}
			{/if}
			<text x={(s.x + C.x) / 2} y={(s.y + C.y) / 2 - 8} class="lat">{layanan?.[s.kunci]?.ok ? `${layanan[s.kunci].ms} ms` : '—'}</text>
		{/each}

		<!-- simpul layanan -->
		{#each SIMPUL as s (s.kunci)}
			{@const st = status(layanan?.[s.kunci])}
			<g class={`simpul ${st}`} transform={`translate(${s.x},${s.y})`}>
				<circle r="34" class="cincin-luar" />
				<circle r="27" class="badan" />
				{#if s.ikon === 'db'}
					<g class="ikon"><ellipse cx="0" cy="-8" rx="10" ry="4" /><path d="M-10,-8 v16 a10,4 0 0,0 20,0 v-16" /><path d="M-10,0 a10,4 0 0,0 20,0" /></g>
				{:else if s.ikon === 'kilat'}
					<g class="ikon"><path d="M3,-13 L-7,2 L0,2 L-3,13 L8,-3 L1,-3 Z" /></g>
				{:else if s.ikon === 'gelombang'}
					<g class="ikon"><path d="M-12,0 q4,-10 8,0 t8,0 t8,0" /><path d="M-12,7 q4,-10 8,0 t8,0 t8,0" opacity="0.5" /></g>
				{:else}
					<g class="ikon"><circle cx="0" cy="0" r="3" /><circle cx="-9" cy="-7" r="2" /><circle cx="9" cy="-7" r="2" /><circle cx="-9" cy="8" r="2" /><circle cx="9" cy="8" r="2" /><path d="M0,0 L-9,-7 M0,0 L9,-7 M0,0 L-9,8 M0,0 L9,8" /></g>
				{/if}
				<text y="52" class="nama">{s.nama}</text>
				<text y="65" class="sub">{s.sub}</text>
			</g>
		{/each}

		<!-- inti server -->
		<g transform={`translate(${C.x},${C.y})`} class="inti">
			<rect x="-46" y="-30" width="92" height="60" rx="14" class="inti-badan" />
			<path d="M-20,-10 h40 M-20,0 h40 M-20,10 h26" class="inti-garis" />
			<circle cx="30" cy="10" r="3.2" class="led" />
			<text y="48" class="nama">Server Bizgrow</text>
		</g>
	</svg>
	<div class="status">
		{#each SIMPUL as s (s.kunci)}
			{@const l = layanan?.[s.kunci]}
			<div class={`st ${status(l)}`}>
				<i></i><b>{s.nama}</b>
				<span>{l?.ok ? `sehat · ${l.ms} ms${l.klien != null ? ` · ${l.klien} klien` : ''}${l.kunci != null ? ` · ${l.kunci} kunci` : ''}${l.jumlahModel != null ? ` · ${l.jumlahModel} model` : ''}` : l?.galat || 'tidak terhubung'}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	svg {
		width: 100%;
		display: block;
		overflow: visible;
	}
	.radar-cincin {
		fill: none;
		stroke: rgba(62, 240, 208, 0.1);
		stroke-dasharray: 2 5;
	}
	.sapu {
		transform-origin: 300px 190px;
		animation: sapu 4s linear infinite;
	}
	.kabel {
		fill: none;
		stroke-width: 6;
		stroke: rgba(62, 240, 208, 0.12);
	}
	.kabel.mati {
		stroke: rgba(255, 107, 138, 0.15);
	}
	.aliran {
		fill: none;
		stroke-width: 1.6;
		stroke: #3ef0d0;
		stroke-dasharray: 6 10;
		animation: alir 1.4s linear infinite;
	}
	.aliran.lambat {
		stroke: #ffc65c;
	}
	.aliran.mati {
		stroke: #ff6b8a;
		stroke-dasharray: 2 8;
		animation: none;
		opacity: 0.6;
	}
	.partikel {
		fill: #e9fffb;
		filter: drop-shadow(0 0 4px #3ef0d0);
	}
	.partikel.lambat {
		filter: drop-shadow(0 0 4px #ffc65c);
	}
	.lat {
		fill: #b9c3e3;
		font: 10px var(--f-mono, monospace);
		text-anchor: middle;
	}
	.cincin-luar {
		fill: none;
		stroke: rgba(62, 240, 208, 0.35);
		stroke-dasharray: 4 4;
		animation: putar 14s linear infinite;
		transform-box: fill-box;
		transform-origin: center;
	}
	.badan {
		fill: #0b1226;
		stroke: #3ef0d0;
		stroke-width: 1.5;
	}
	.simpul.lambat .badan,
	.simpul.lambat .cincin-luar {
		stroke: #ffc65c;
	}
	.simpul.mati .badan,
	.simpul.mati .cincin-luar {
		stroke: #ff6b8a;
	}
	.simpul.mati .badan {
		animation: kedip 1.2s ease-in-out infinite;
	}
	.ikon {
		fill: none;
		stroke: #e6ecff;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.nama {
		fill: #e6ecff;
		font: 600 12px var(--f-tampil, sans-serif);
		text-anchor: middle;
	}
	.sub {
		fill: #6f7ba0;
		font: 9.5px var(--f-mono, monospace);
		text-anchor: middle;
	}
	.inti-badan {
		fill: #10183a;
		stroke: #9b8cff;
		stroke-width: 1.5;
		filter: drop-shadow(0 0 16px rgba(155, 140, 255, 0.45));
	}
	.inti-garis {
		stroke: rgba(230, 236, 255, 0.55);
		stroke-width: 2;
		stroke-linecap: round;
	}
	.led {
		fill: #7dffa1;
		animation: kedip 1.6s ease-in-out infinite;
	}
	.status {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 6px 14px;
		margin-top: 10px;
		font-size: 11.5px;
	}
	.st {
		display: grid;
		grid-template-columns: 10px auto 1fr;
		gap: 8px;
		align-items: center;
		color: #8a96b8;
	}
	.st i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #3ef0d0;
		box-shadow: 0 0 8px #3ef0d0;
	}
	.st.lambat i {
		background: #ffc65c;
		box-shadow: 0 0 8px #ffc65c;
	}
	.st.mati i {
		background: #ff6b8a;
		box-shadow: 0 0 8px #ff6b8a;
	}
	.st b {
		color: #e6ecff;
		font-weight: 600;
	}
	.st span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@keyframes alir {
		to {
			stroke-dashoffset: -32;
		}
	}
	@keyframes sapu {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes kedip {
		50% {
			opacity: 0.35;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sapu,
		.aliran,
		.cincin-luar,
		.led,
		.simpul.mati .badan {
			animation: none;
		}
		.partikel {
			display: none;
		}
	}
</style>
