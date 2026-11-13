<script>
	/** Latar bidang bintang: bintang berkelip & bergeser pelan, sesekali bintang jatuh. */
	import { onMount } from 'svelte';
	import { gerakMinimal } from './util.js';

	/** @type {HTMLCanvasElement} */
	let kanvas;

	onMount(() => {
		const ctx = kanvas.getContext('2d');
		if (!ctx) return;
		const diam = gerakMinimal();
		let w = 0;
		let h = 0;
		let dpr = 1;
		/** @type {{ x: number, y: number, r: number, f: number, v: number, warna: string }[]} */
		let bintang = [];
		/** @type {{ x: number, y: number, vx: number, vy: number, umur: number } | null} */
		let jatuh = null;
		let raf = 0;

		const warna = ['#ffffff', '#cfe0ff', '#a6fff0', '#d9ccff'];
		function ukur() {
			dpr = Math.min(2, window.devicePixelRatio || 1);
			w = kanvas.clientWidth;
			h = kanvas.clientHeight;
			kanvas.width = w * dpr;
			kanvas.height = h * dpr;
			ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
			const n = Math.round((w * h) / 5200);
			bintang = Array.from({ length: n }, () => ({
				x: Math.random() * w,
				y: Math.random() * h,
				r: Math.random() * 1.2 + 0.2,
				f: Math.random() * Math.PI * 2,
				v: Math.random() * 0.06 + 0.01,
				warna: warna[Math.floor(Math.random() * warna.length)]
			}));
		}

		/** @param {number} t */
		function gambar(t) {
			if (!ctx) return;
			ctx.clearRect(0, 0, w, h);
			for (const b of bintang) {
				if (!diam) {
					b.x -= b.v;
					if (b.x < -2) b.x = w + 2;
				}
				const kelip = diam ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t / 1400 + b.f));
				ctx.globalAlpha = kelip * (0.35 + b.r / 2);
				ctx.fillStyle = b.warna;
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
				ctx.fill();
			}
			if (!diam) {
				if (!jatuh && Math.random() < 0.0025) jatuh = { x: Math.random() * w * 0.7 + w * 0.3, y: Math.random() * h * 0.35, vx: -7, vy: 3.2, umur: 0 };
				if (jatuh) {
					const g = ctx.createLinearGradient(jatuh.x, jatuh.y, jatuh.x - jatuh.vx * 14, jatuh.y - jatuh.vy * 14);
					g.addColorStop(0, 'rgba(180,255,240,0.9)');
					g.addColorStop(1, 'rgba(180,255,240,0)');
					ctx.globalAlpha = 1 - jatuh.umur / 60;
					ctx.strokeStyle = g;
					ctx.lineWidth = 1.4;
					ctx.beginPath();
					ctx.moveTo(jatuh.x, jatuh.y);
					ctx.lineTo(jatuh.x - jatuh.vx * 14, jatuh.y - jatuh.vy * 14);
					ctx.stroke();
					jatuh.x += jatuh.vx;
					jatuh.y += jatuh.vy;
					if (++jatuh.umur > 60) jatuh = null;
				}
			}
			ctx.globalAlpha = 1;
			if (!diam) raf = requestAnimationFrame(gambar);
		}

		ukur();
		gambar(0);
		const ro = new ResizeObserver(() => {
			ukur();
			if (diam) gambar(0);
		});
		ro.observe(kanvas);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
</script>

<canvas bind:this={kanvas} class="bintang" aria-hidden="true"></canvas>

<style>
	.bintang {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
	}
</style>
