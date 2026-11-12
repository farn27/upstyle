<script>
	/**
	 * Analisis Cerdas dasbor — hasil mesin statistik server (/api/analitik): skor kesehatan terjelaskan,
	 * peramalan Holt-Winters + kisaran, wawasan & rekomendasi, pola hari, produk, anomali.
	 * Tanpa model AI generatif → tidak memakai token/kuota.
	 */
	import { onDestroy, tick } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { Sparkles, RefreshCw, AlertTriangle, AlertCircle, CheckCircle2, Info, ChevronDown, ArrowRight, TrendingUp, TrendingDown } from 'lucide-svelte';

	/** @type {string | undefined} */
	export let slug;
	/** @type {string | number} Berubah setiap data dasbor berubah → analisis dimuat ulang */
	export let versi = 0;
	/** @type {any} hasil analisis (bisa di-bind oleh induk untuk Health Score) */
	export let analisis = null;

	let memuat = false;
	let galat = '';
	let detail = false;
	/** @type {HTMLCanvasElement | undefined} */
	let kanvas;
	/** @type {any} */
	let grafik = null;
	let terakhir = '';

	const rp = (/** @type {number} */ n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
	const rpSingkat = (/** @type {number} */ n) => {
		const v = Math.abs(Number(n) || 0);
		if (v >= 1e9) return `Rp${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
		if (v >= 1e6) return `Rp${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
		if (v >= 1e3) return `Rp${Math.round(n / 1e3).toLocaleString('id-ID')} rb`;
		return rp(n);
	};
	const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	const tglPendek = (/** @type {string} */ d) => `${Number(d.slice(8))} ${BLN[Number(d.slice(5, 7)) - 1]}`;

	async function muat(segar = false) {
		if (!slug) return;
		memuat = true;
		galat = '';
		try {
			const res = await fetch(`/api/analitik?unit=${encodeURIComponent(slug)}${segar ? '&segar=1' : ''}`);
			const j = await res.json();
			if (!res.ok || !j.success) throw new Error(j.message || 'Gagal memuat analisis');
			analisis = j.data;
			await tick();
			gambar();
		} catch (e) {
			galat = e instanceof Error ? e.message : 'Gagal memuat analisis';
		} finally {
			memuat = false;
		}
	}

	// muat saat unit/data berubah (dijeda agar perubahan beruntun tidak memicu banyak permintaan)
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let jeda;
	$: kunci = `${slug}:${versi}`;
	$: if (kunci !== terakhir) {
		terakhir = kunci;
		clearTimeout(jeda);
		jeda = setTimeout(() => muat(), analisis ? 1200 : 0);
	}

	async function gambar() {
		if (!kanvas || !analisis?.prediksi) return;
		const { default: Chart } = await import('chart.js/auto');
		const p = analisis.prediksi;
		const label = [...p.riwayat.map((/** @type {any} */ r) => r.tanggal), ...p.ramalan.map((/** @type {any} */ r) => r.tanggal)].map(tglPendek);
		const n = p.riwayat.length;
		const aktual = [...p.riwayat.map((/** @type {any} */ r) => r.nilai), ...p.ramalan.map(() => null)];
		// sambungkan garis ramalan dengan titik aktual terakhir
		const ramal = [...p.riwayat.map((/** @type {any} */ _, /** @type {number} */ i) => (i === n - 1 ? p.riwayat[n - 1].nilai : null)), ...p.ramalan.map((/** @type {any} */ r) => r.nilai)];
		const atas = [...p.riwayat.map(() => null), ...p.ramalan.map((/** @type {any} */ r) => r.atas)];
		const bawah = [...p.riwayat.map(() => null), ...p.ramalan.map((/** @type {any} */ r) => r.bawah)];
		const gelap = document.documentElement.classList.contains('dark');
		const teks = gelap ? '#94a3b8' : '#64748b';
		const garis = gelap ? '#1e293b' : '#f1f5f9';
		grafik?.destroy();
		grafik = new Chart(kanvas, {
			type: 'line',
			data: {
				labels: label,
				datasets: [
					{ label: 'Batas atas', data: atas, borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(99,102,241,0.12)' },
					{ label: 'Batas bawah', data: bawah, borderWidth: 0, pointRadius: 0, fill: false },
					{ label: 'Omzet', data: aktual, borderColor: '#10b981', backgroundColor: '#10b981', borderWidth: 2, pointRadius: 0, tension: 0.3 },
					{ label: 'Prediksi', data: ramal, borderColor: '#6366f1', backgroundColor: '#6366f1', borderWidth: 2, borderDash: [5, 4], pointRadius: 2, tension: 0.3 }
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { labels: { color: teks, boxWidth: 10, font: { size: 10 }, filter: (/** @type {any} */ i) => !String(i.text).startsWith('Batas') } },
					tooltip: { callbacks: { label: (/** @type {any} */ c) => (c.raw == null ? '' : `${c.dataset.label}: ${rp(c.raw)}`) } }
				},
				scales: {
					x: { ticks: { color: teks, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 9 } }, grid: { display: false } },
					y: { beginAtZero: true, ticks: { color: teks, font: { size: 9 }, callback: (/** @type {any} */ v) => rpSingkat(Number(v)) }, grid: { color: garis } }
				}
			}
		});
	}

	onDestroy(() => {
		clearTimeout(jeda);
		grafik?.destroy();
	});

	$: k = analisis?.kesehatan;
	$: p = analisis?.prediksi;
	$: warnaSkor = !k ? '#94a3b8' : k.skor >= 80 ? '#10b981' : k.skor >= 65 ? '#6366f1' : k.skor >= 45 ? '#f59e0b' : '#f43f5e';
	$: capai = p ? Math.min(100, Math.round((p.akhirBulan.aktualSejauhIni / Math.max(1, p.akhirBulan.nilai)) * 100)) : 0;
	$: maksPola = analisis ? Math.max(1, ...analisis.pola.map((/** @type {any} */ x) => x.rata)) : 1;

	const GAYA = {
		bahaya: { ikon: AlertTriangle, kelas: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' },
		peringatan: { ikon: AlertCircle, kelas: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
		baik: { ikon: CheckCircle2, kelas: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
		info: { ikon: Info, kelas: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400' }
	};
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden" aria-labelledby="judul-analisis">
	<!-- Kepala -->
	<div class="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
		<div class="flex items-center gap-2 min-w-0">
			<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm shrink-0">
				<Sparkles class="w-2.5 h-2.5" /> Analisis Cerdas
			</span>
			<p id="judul-analisis" class="text-[10px] text-slate-400 dark:text-slate-500 truncate">
				Statistik otomatis · tanpa token{#if analisis} · {new Date(analisis.dibuat).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{/if}
			</p>
		</div>
		<button type="button" on:click={() => muat(true)} disabled={memuat} class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50" aria-label="Hitung ulang analisis" title="Hitung ulang">
			<RefreshCw class="w-3.5 h-3.5 {memuat ? 'animate-spin' : ''}" />
		</button>
	</div>

	{#if galat && !analisis}
		<div class="p-5 text-xs text-rose-600 flex items-center justify-between gap-3">
			<span>{galat}</span>
			<button type="button" class="font-bold underline" on:click={() => muat(true)}>Coba lagi</button>
		</div>
	{:else if !analisis}
		<!-- kerangka memuat -->
		<div class="p-5 grid md:grid-cols-3 gap-5 animate-pulse">
			<div class="h-36 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
			<div class="h-36 rounded-xl bg-slate-100 dark:bg-slate-800 md:col-span-2"></div>
		</div>
	{:else}
		<div in:fade={{ duration: 200 }}>
			<!-- Ringkasan -->
			<p class="px-4 sm:px-5 pt-3 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">{analisis.ringkasan}</p>

			<div class="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-5 gap-5">
				<!-- Skor kesehatan -->
				<div class="md:col-span-2">
					<div class="flex items-center gap-4">
						<div class="relative w-20 h-20 shrink-0">
							<svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
								<circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-width="10" />
								<circle cx="50" cy="50" r="42" fill="none" stroke={warnaSkor} stroke-width="10" stroke-linecap="round" stroke-dasharray="263.9" stroke-dashoffset={263.9 - (263.9 * (k?.skor || 0)) / 100} class="transition-all duration-700" />
							</svg>
							<div class="absolute inset-0 flex flex-col items-center justify-center">
								<span class="text-xl font-black text-slate-800 dark:text-white leading-none">{k?.skor ?? 0}</span>
								<span class="text-[9px] font-black mt-0.5" style="color:{warnaSkor}">NILAI {k?.nilai}</span>
							</div>
						</div>
						<div class="flex-1 min-w-0 space-y-1.5">
							{#each k?.komponen || [] as c}
								<div title={c.alasan}>
									<div class="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
										<span class="truncate">{c.nama}</span><span>{c.skor}</span>
									</div>
									<div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
										<div class="h-full rounded-full transition-all duration-700" style="width:{c.skor}%;background:{c.skor >= 70 ? '#10b981' : c.skor >= 45 ? '#f59e0b' : '#f43f5e'}"></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
					<ul class="mt-3 space-y-1">
						{#each (k?.komponen || []).filter((/** @type {any} */ c) => c.skor < 60) as c}
							<li class="text-[10px] text-slate-500 dark:text-slate-400"><span class="font-bold text-slate-700 dark:text-slate-200">{c.nama}:</span> {c.alasan}</li>
						{/each}
					</ul>
				</div>

				<!-- Prediksi -->
				<div class="md:col-span-3">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Perkiraan omzet bulan ini</p>
							<p class="text-lg sm:text-xl font-black text-slate-800 dark:text-white">{rp(p.akhirBulan.nilai)}</p>
							<p class="text-[10px] text-slate-500 dark:text-slate-400">kisaran {rpSingkat(p.akhirBulan.bawah)} – {rpSingkat(p.akhirBulan.atas)} · bulan lalu {rpSingkat(p.akhirBulan.bulanLalu)}</p>
						</div>
						<div class="text-right shrink-0">
							<span class="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-bold text-slate-500 dark:text-slate-400" title={p.parameter ? `α=${p.parameter.alpha} β=${p.parameter.beta} γ=${p.parameter.gamma}` : ''}>{p.metode}</span>
							<p class="text-[9px] mt-1 text-slate-400">{p.galatUji === null ? 'data belum cukup untuk uji akurasi' : `galat uji 7 hari ±${p.galatUji}%`}</p>
						</div>
					</div>
					<div class="mt-2">
						<div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" title="Sudah tercatat vs perkiraan akhir bulan">
							<div class="h-full bg-emerald-500 rounded-full" style="width:{capai}%"></div>
						</div>
						<p class="text-[9px] text-slate-400 mt-1">Tercatat {rpSingkat(p.akhirBulan.aktualSejauhIni)} ({capai}% dari perkiraan)</p>
					</div>
					<div class="h-36 sm:h-40 mt-2"><canvas bind:this={kanvas} aria-label="Grafik omzet 28 hari dan prediksi 7 hari"></canvas></div>
				</div>
			</div>

			<!-- Wawasan & rekomendasi -->
			{#if analisis.wawasan.length}
				<div class="px-4 sm:px-5 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-2">
					{#each analisis.wawasan.slice(0, detail ? 8 : 4) as w (w.judul)}
						{@const g = GAYA[/** @type {keyof typeof GAYA} */ (w.tipe)] || GAYA.info}
						<div class="flex gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800" transition:slide={{ duration: 150 }}>
							<span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 {g.kelas}"><svelte:component this={g.ikon} class="w-3.5 h-3.5" /></span>
							<div class="min-w-0">
								<p class="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-snug">{w.judul}</p>
								<p class="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{w.isi}</p>
								{#if w.aksi}<p class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1 flex items-start gap-1"><ArrowRight class="w-3 h-3 mt-px shrink-0" />{w.aksi}</p>{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Detail -->
			<button type="button" on:click={() => (detail = !detail)} class="w-full px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1">
				{detail ? 'Sembunyikan detail' : 'Lihat pola, produk & anomali'}
				<ChevronDown class="w-3 h-3 transition-transform {detail ? 'rotate-180' : ''}" />
			</button>
			{#if detail}
				<div class="px-4 sm:px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-5" transition:slide={{ duration: 200 }}>
					<!-- Pola hari -->
					<div>
						<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Rata-rata omzet per hari (8 minggu)</p>
						<div class="space-y-1">
							{#each analisis.pola as h}
								<div class="flex items-center gap-2 text-[10px]">
									<span class="w-12 text-slate-500 dark:text-slate-400">{h.hari}</span>
									<div class="flex-1 h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div class="h-full rounded bg-indigo-500" style="width:{(h.rata / maksPola) * 100}%"></div></div>
									<span class="w-14 text-right font-mono text-slate-600 dark:text-slate-300">{rpSingkat(h.rata)}</span>
								</div>
							{/each}
						</div>
						{#if analisis.tren}
							<p class="text-[10px] mt-2 text-slate-500 dark:text-slate-400 flex items-center gap-1">
								{#if analisis.tren.perMinggu >= 0}<TrendingUp class="w-3 h-3 text-emerald-500" />{:else}<TrendingDown class="w-3 h-3 text-rose-500" />{/if}
								Tren 4 minggu: {analisis.tren.perMinggu > 0 ? '+' : ''}{analisis.tren.perMinggu}%/minggu (R² {analisis.tren.r2})
							</p>
						{/if}
					</div>
					<!-- Produk -->
					<div class="space-y-3 text-[10px]">
						<div>
							<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Produk andalan (kelas A · 80% pendapatan)</p>
							{#each analisis.produk.kelasA as x}<p class="flex justify-between text-slate-600 dark:text-slate-300"><span class="truncate">{x.nama}</span><span class="font-mono">{x.porsi}%</span></p>{:else}<p class="text-slate-400">Belum ada penjualan produk.</p>{/each}
						</div>
						{#if analisis.produk.naik.length || analisis.produk.turun.length}
							<div>
								<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pergerakan 14 hari</p>
								{#each analisis.produk.naik as x}<p class="flex justify-between text-emerald-600"><span class="truncate">▲ {x.nama}</span><span>+{x.ubah}%</span></p>{/each}
								{#each analisis.produk.turun as x}<p class="flex justify-between text-rose-600"><span class="truncate">▼ {x.nama}</span><span>{x.ubah}%</span></p>{/each}
							</div>
						{/if}
						{#if analisis.produk.segeraHabis.length}
							<div>
								<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Perkiraan habis & saran restock</p>
								{#each analisis.produk.segeraHabis as x}<p class="flex justify-between text-slate-600 dark:text-slate-300"><span class="truncate">{x.nama} <span class="text-slate-400">(stok {x.stok})</span></span><span>{x.stok === 0 ? 'habis' : x.hari === null ? '—' : `±${x.hari} hr`} · +{x.restock}</span></p>{/each}
							</div>
						{/if}
						{#if analisis.produk.tidakLaku.length}
							<div>
								<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tidak terjual 30 hari</p>
								{#each analisis.produk.tidakLaku as x}<p class="flex justify-between text-slate-600 dark:text-slate-300"><span class="truncate">{x.nama} <span class="text-slate-400">({x.stok})</span></span><span>{rpSingkat(x.nilai)}</span></p>{/each}
							</div>
						{/if}
					</div>
					<!-- Anomali -->
					<div class="text-[10px]">
						<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hari yang tidak biasa (14 hari)</p>
						{#each analisis.anomali as a}
							<div class="py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
								<p class="font-bold {a.arah === 'turun' ? 'text-rose-600' : a.jenis === 'pengeluaran' ? 'text-amber-600' : 'text-emerald-600'}">{tglPendek(a.tanggal)} · {a.jenis} {a.arah === 'naik' ? 'melonjak' : 'anjlok'}</p>
								<p class="text-slate-500 dark:text-slate-400">{rp(a.nilai)} (biasanya ±{rpSingkat(a.normal)}){a.penyebab ? ` · ${a.penyebab}` : ''}</p>
							</div>
						{:else}
							<p class="text-slate-400">{p.kepadatan < 60 ? 'Pencatatan belum harian — deteksi dimatikan agar tidak salah tanda.' : 'Tidak ada yang janggal. 👍'}</p>
						{/each}
						<p class="mt-3 text-[9px] text-slate-400 leading-snug">Metode: Holt-Winters musiman mingguan (parameter otomatis), uji balik 7 hari, skor-z robust (median/MAD), analisis ABC/Pareto. Data {p.hariData} hari, kepadatan pencatatan {p.kepadatan}%.</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</section>
