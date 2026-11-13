<script>
	/**
	 * Sistem orbit tenant: inti = Bizgrow, setiap pemilik punya lintasan, setiap unit bisnis = planet.
	 * Ukuran planet ∝ √aktivitas 30 hari, warna = kategori usaha, halo berdenyut = aktif 24 jam terakhir.
	 */
	import { warnaDari, angka, relatif } from './util.js';

	/** @type {{ units: any[], pemilik: { id: number, nama: string }[], pilih?: (u: any) => void }} */
	let { units = [], pemilik = [], pilih } = $props();

	const C = 280;
	/** @type {any} */
	let sorot = $state(null);
	let posisi = $state({ x: 0, y: 0 });

	const lintasan = $derived.by(() => {
		const daftar = pemilik.length ? pemilik : [...new Set(units.map((u) => u.pemilik))].map((id) => ({ id, nama: `#${id}` }));
		const n = Math.max(1, daftar.length);
		const maksAkt = Math.max(1, ...units.map((u) => u.trx30 + u.pos30));
		return daftar.map((p, i) => {
			const r = n === 1 ? 165 : 92 + (i * (238 - 92)) / (n - 1);
			const milik = units.filter((u) => u.pemilik === p.id);
			const durasi = 70 + i * 28;
			const awal = (i * 137.5) % 360;
			return {
				...p,
				r,
				durasi,
				arah: i % 2 ? -1 : 1,
				planet: milik.map((u, k) => {
					const sudut = ((awal + (k * 360) / Math.max(1, milik.length)) * Math.PI) / 180;
					const akt = u.trx30 + u.pos30;
					return {
						...u,
						x: C + r * Math.cos(sudut),
						y: C + r * Math.sin(sudut),
						rad: 5 + 15 * Math.sqrt(akt / maksAkt),
						warna: warnaDari(u.kategori)
					};
				})
			};
		});
	});

	const kategori = $derived([...new Set(units.map((u) => u.kategori))]);
	const aktif = $derived(units.filter((u) => u.aktif24).length);

	/** @param {PointerEvent} e @param {any} p */
	function arah(e, p) {
		const kotak = /** @type {HTMLElement} */ (e.currentTarget).closest('.orbit')?.getBoundingClientRect();
		if (!kotak) return;
		posisi = { x: e.clientX - kotak.left, y: e.clientY - kotak.top };
		sorot = p;
	}
</script>

<div class="orbit" role="group" aria-label="Peta orbit tenant">
	<svg viewBox="0 0 560 560" class="kanvas">
		<defs>
			<radialGradient id="inti" cx="45%" cy="40%" r="60%">
				<stop offset="0%" stop-color="#ffffff" />
				<stop offset="25%" stop-color="#9ff8ea" />
				<stop offset="60%" stop-color="#3b6cff" />
				<stop offset="100%" stop-color="#1a1050" />
			</radialGradient>
			<radialGradient id="pendar" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="rgba(62,240,208,0.35)" />
				<stop offset="100%" stop-color="rgba(62,240,208,0)" />
			</radialGradient>
			{#each kategori as k (k)}
				<radialGradient id={`pl-${k.replace(/\W/g, '')}`} cx="35%" cy="30%" r="75%">
					<stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
					<stop offset="35%" stop-color={warnaDari(k)} />
					<stop offset="100%" stop-color="#05070f" />
				</radialGradient>
			{/each}
			<filter id="cahaya" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="4" result="b" />
				<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
			</filter>
		</defs>

		<!-- kisi radial & sinar -->
		{#each [60, 120, 180, 240] as r (r)}
			<circle cx={C} cy={C} {r} class="kisi" />
		{/each}
		{#each Array(12) as _, i (i)}
			<line x1={C} y1={C} x2={C + 268 * Math.cos((i * Math.PI) / 6)} y2={C + 268 * Math.sin((i * Math.PI) / 6)} class="sinar" />
		{/each}

		<!-- lintasan + planet -->
		{#each lintasan as l (l.id)}
			<circle cx={C} cy={C} r={l.r} class="lintas" />
			<g class="putar" style={`--durasi:${l.durasi}s; --arah:${l.arah === 1 ? 'normal' : 'reverse'}`}>
				{#each l.planet as p (p.id)}
					<g
						class="planet"
						class:aktif={p.aktif24}
						role="button"
						tabindex="0"
						aria-label={`${p.nama}: ${p.trx30} transaksi, ${p.pos30} order POS dalam 30 hari`}
						onpointerenter={(e) => arah(e, p)}
						onpointermove={(e) => arah(e, p)}
						onpointerleave={() => (sorot = null)}
						onclick={() => pilih?.(p)}
						onkeydown={(e) => e.key === 'Enter' && pilih?.(p)}
					>
						{#if p.aktif24}
							<circle cx={p.x} cy={p.y} r={p.rad + 6} class="halo" style={`stroke:${p.warna}`} />
						{/if}
						<circle cx={p.x} cy={p.y} r={p.rad + 14} fill="transparent" />
						<circle cx={p.x} cy={p.y} r={p.rad} fill={`url(#pl-${p.kategori.replace(/\W/g, '')})`} filter="url(#cahaya)" />
						{#if p.cabang}
							<circle cx={p.x} cy={p.y} r={p.rad + 3} class="cabang" />
						{/if}
					</g>
				{/each}
			</g>
		{/each}

		<!-- inti -->
		<circle cx={C} cy={C} r="78" fill="url(#pendar)" />
		<g class="cincin-inti">
			<circle cx={C} cy={C} r="52" class="putus" />
			<circle cx={C} cy={C} r="60" class="putus tipis" />
		</g>
		<circle cx={C} cy={C} r="38" fill="url(#inti)" class="jantung" />
		<text x={C} y={C + 1} class="label-inti">{units.length}</text>
		<text x={C} y={C + 17} class="sub-inti">UNIT</text>
	</svg>

	{#if sorot}
		<div class="tip" style={`left:${posisi.x}px; top:${posisi.y}px`}>
			<b style={`color:${sorot.warna}`}>{sorot.nama}</b>
			<span>{sorot.kategori}{sorot.cabang ? ' · cabang' : ''}</span>
			<span>{angka(sorot.trx30)} transaksi · {angka(sorot.pos30)} order POS</span>
			<span class="redup">aktivitas terakhir {relatif(sorot.akhir)}</span>
		</div>
	{/if}

	<div class="legenda">
		<span><i class="titik nyala"></i>{aktif} aktif 24 jam</span>
		{#each kategori as k (k)}
			<span><i class="titik" style={`background:${warnaDari(k)}`}></i>{k}</span>
		{/each}
	</div>
</div>

<style>
	.orbit {
		position: relative;
		width: 100%;
		max-width: 620px;
		margin: 0 auto;
	}
	.kanvas {
		width: 100%;
		height: auto;
		display: block;
		overflow: visible;
	}
	.kisi {
		fill: none;
		stroke: rgb(var(--kisi-rgb) / 0.07);
	}
	.sinar {
		stroke: rgb(var(--kisi-rgb) / 0.05);
	}
	.lintas {
		fill: none;
		stroke: rgb(var(--ungu-rgb) / 0.28);
		stroke-dasharray: 2 6;
	}
	.putar {
		transform-box: view-box;
		transform-origin: 280px 280px;
		animation: putar var(--durasi) linear infinite;
		animation-direction: var(--arah);
	}
	.orbit:hover .putar {
		animation-play-state: paused;
	}
	.planet {
		cursor: pointer;
		outline: none;
	}
	.planet:focus-visible circle:last-of-type {
		stroke: #fff;
		stroke-width: 2;
	}
	.halo {
		fill: none;
		stroke-width: 1.5;
		transform-box: fill-box;
		transform-origin: center;
		animation: denyut 2.4s ease-out infinite;
	}
	.cabang {
		fill: none;
		stroke: rgb(var(--kontras-rgb) / 0.5);
		stroke-dasharray: 2 3;
	}
	.cincin-inti {
		transform-box: view-box;
		transform-origin: 280px 280px;
		animation: putar 18s linear infinite;
	}
	.putus {
		fill: none;
		stroke: rgb(var(--aksen-rgb) / 0.55);
		stroke-dasharray: 14 10;
	}
	.putus.tipis {
		stroke: rgb(var(--ungu-rgb) / 0.4);
		stroke-dasharray: 3 7;
	}
	.jantung {
		transform-box: fill-box;
		transform-origin: center;
		animation: napas 4s ease-in-out infinite;
	}
	.label-inti {
		fill: #fff;
		font: 700 22px var(--f-mono, monospace);
		text-anchor: middle;
	}
	.sub-inti {
		fill: rgba(255, 255, 255, 0.8);
		font: 600 8px var(--f-mono, monospace);
		letter-spacing: 3px;
		text-anchor: middle;
	}
	.tip {
		position: absolute;
		transform: translate(14px, -50%);
		pointer-events: none;
		display: grid;
		gap: 2px;
		min-width: 190px;
		padding: 10px 12px;
		background: var(--tip-bg);
		border: 1px solid rgb(var(--aksen-rgb) / 0.35);
		border-radius: 10px;
		font-size: 12px;
		color: var(--teks);
		backdrop-filter: blur(6px);
		z-index: 5;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
	}
	.tip b {
		font-size: 13px;
	}
	.redup {
		color: var(--redup);
	}
	.legenda {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		justify-content: center;
		font-size: 11px;
		color: var(--teks-2);
		margin-top: 4px;
	}
	.titik {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 6px;
		vertical-align: middle;
	}
	.titik.nyala {
		background: var(--aksen);
		box-shadow: 0 0 0 0 rgb(var(--aksen-rgb) / 0.7);
		animation: denyut-titik 2s infinite;
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes denyut {
		0% {
			transform: scale(0.85);
			opacity: 0.9;
		}
		100% {
			transform: scale(1.9);
			opacity: 0;
		}
	}
	@keyframes napas {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.06);
		}
	}
	@keyframes denyut-titik {
		70% {
			box-shadow: 0 0 0 8px rgb(var(--aksen-rgb) / 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgb(var(--aksen-rgb) / 0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.putar,
		.halo,
		.cincin-inti,
		.jantung,
		.titik.nyala {
			animation: none;
		}
	}
</style>
