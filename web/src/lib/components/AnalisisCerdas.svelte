<script>
	/**
	 * Analisis Cerdas dasbor — hasil mesin statistik server (/api/analitik): skor kesehatan terjelaskan,
	 * kompetisi model peramalan (ensemble) + kisaran, wawasan & rekomendasi, proyeksi arus kas, titik impas,
	 * analisis produk (margin, bundling, penggerak omzet), pola hari/jam, efek gajian, anomali.
	 * Tanpa model AI generatif → tidak memakai token/kuota.
	 */
	import { onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Sparkles, RefreshCw, AlertTriangle, AlertCircle, CheckCircle2, Info, ArrowRight, TrendingUp, TrendingDown, Lightbulb, Wallet, Package, Activity } from 'lucide-svelte';

	/** @type {string | undefined} */
	export let slug;
	/** @type {string | number} Berubah setiap data dasbor berubah → analisis dimuat ulang */
	export let versi = 0;
	/** @type {any} hasil analisis (bisa di-bind oleh induk untuk Health Score) */
	export let analisis = null;

	let memuat = false;
	let galat = '';
	let tab = 'wawasan';
	let semuaWawasan = false;
	/** @type {HTMLCanvasElement | undefined} */
	let kanvas;
	/** @type {HTMLCanvasElement | undefined} */
	let kanvasKas;
	/** @type {any} */
	let grafik = null;
	/** @type {any} */
	let grafikKas = null;
	let terakhir = '';

	const rp = (/** @type {number} */ n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
	const rpSingkat = (/** @type {number} */ n) => {
		const v = Math.abs(Number(n) || 0);
		const tanda = n < 0 ? '−' : '';
		if (v >= 1e9) return `${tanda}Rp${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
		if (v >= 1e6) return `${tanda}Rp${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
		if (v >= 1e3) return `${tanda}Rp${Math.round(v / 1e3).toLocaleString('id-ID')} rb`;
		return tanda + rp(v);
	};
	const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	const tglPendek = (/** @type {string} */ d) => `${Number(d.slice(8))} ${BLN[Number(d.slice(5, 7)) - 1]}`;
	const TAB = [
		{ kunci: 'wawasan', label: 'Wawasan', ikon: Lightbulb },
		{ kunci: 'kas', label: 'Arus Kas', ikon: Wallet },
		{ kunci: 'produk', label: 'Produk', ikon: Package },
		{ kunci: 'pola', label: 'Pola & Model', ikon: Activity }
	];

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

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let jeda;
	$: kunci = `${slug}:${versi}`;
	$: if (kunci !== terakhir) {
		terakhir = kunci;
		clearTimeout(jeda);
		jeda = setTimeout(() => muat(), analisis ? 1200 : 0);
	}
	$: if (tab === 'kas' && analisis) tick().then(gambarKas);

	const warnaTeks = () => (document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b');
	const warnaKisi = () => (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9');

	async function gambar() {
		if (!kanvas || !analisis?.prediksi) return;
		const { default: Chart } = await import('chart.js/auto');
		const p = analisis.prediksi;
		const label = [...p.riwayat.map((/** @type {any} */ r) => r.tanggal), ...p.ramalan.map((/** @type {any} */ r) => r.tanggal)].map(tglPendek);
		const n = p.riwayat.length;
		const aktual = [...p.riwayat.map((/** @type {any} */ r) => r.nilai), ...p.ramalan.map(() => null)];
		const ramal = [...p.riwayat.map((/** @type {any} */ _, /** @type {number} */ i) => (i === n - 1 ? p.riwayat[n - 1].nilai : null)), ...p.ramalan.map((/** @type {any} */ r) => r.nilai)];
		const atas = [...p.riwayat.map(() => null), ...p.ramalan.map((/** @type {any} */ r) => r.atas)];
		const bawah = [...p.riwayat.map(() => null), ...p.ramalan.map((/** @type {any} */ r) => r.bawah)];
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
			options: opsiGaris()
		});
	}

	async function gambarKas() {
		if (!kanvasKas || !analisis?.kas?.proyeksi?.length) return;
		const { default: Chart } = await import('chart.js/auto');
		const d = analisis.kas.proyeksi;
		grafikKas?.destroy();
		grafikKas = new Chart(kanvasKas, {
			type: 'line',
			data: {
				labels: d.map((/** @type {any} */ x) => tglPendek(x.tanggal)),
				datasets: [{ label: 'Proyeksi saldo kas', data: d.map((/** @type {any} */ x) => x.saldo), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.25 }]
			},
			options: { ...opsiGaris(), scales: { ...opsiGaris().scales, y: { ...opsiGaris().scales.y, beginAtZero: false } } }
		});
	}

	function opsiGaris() {
		const teks = warnaTeks();
		return {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: /** @type {const} */ ('index'), intersect: false },
			plugins: {
				legend: { labels: { color: teks, boxWidth: 10, font: { size: 10 }, filter: (/** @type {any} */ i) => !String(i.text).startsWith('Batas') } },
				tooltip: { callbacks: { label: (/** @type {any} */ c) => (c.raw == null ? '' : `${c.dataset.label}: ${rp(c.raw)}`) } }
			},
			scales: {
				x: { ticks: { color: teks, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 9 } }, grid: { display: false } },
				y: { beginAtZero: true, ticks: { color: teks, font: { size: 9 }, callback: (/** @type {any} */ v) => rpSingkat(Number(v)) }, grid: { color: warnaKisi() } }
			}
		};
	}

	onDestroy(() => {
		clearTimeout(jeda);
		grafik?.destroy();
		grafikKas?.destroy();
	});

	$: k = analisis?.kesehatan;
	$: p = analisis?.prediksi;
	$: warnaSkor = !k ? '#94a3b8' : k.skor >= 80 ? '#10b981' : k.skor >= 65 ? '#6366f1' : k.skor >= 45 ? '#f59e0b' : '#f43f5e';
	$: capai = p ? Math.min(100, Math.round((p.akhirBulan.aktualSejauhIni / Math.max(1, p.akhirBulan.nilai)) * 100)) : 0;
	$: maksPola = analisis ? Math.max(1, ...analisis.pola.map((/** @type {any} */ x) => x.rata)) : 1;
	$: maksJam = analisis?.jamRamai ? Math.max(1, ...analisis.jamRamai.perJam) : 1;
	$: maksLaba = analisis?.margin?.length ? Math.max(1, ...analisis.margin.map((/** @type {any} */ m) => m.laba)) : 1;
	$: maksGerak = analisis?.penggerak?.daftar?.length ? Math.max(1, ...analisis.penggerak.daftar.map((/** @type {any} */ m) => Math.abs(m.selisih))) : 1;

	const GAYA = {
		bahaya: { ikon: AlertTriangle, kelas: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' },
		peringatan: { ikon: AlertCircle, kelas: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
		baik: { ikon: CheckCircle2, kelas: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
		info: { ikon: Info, kelas: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400' }
	};
	const judulBagian = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2';
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden" aria-labelledby="judul-analisis">
	<!-- Kepala -->
	<div class="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
		<div class="flex items-center gap-2 min-w-0">
			<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm shrink-0">
				<Sparkles class="w-2.5 h-2.5" /> Analisis Cerdas
			</span>
			<p id="judul-analisis" class="text-[10px] text-slate-400 dark:text-slate-500 truncate">
				Mesin statistik · tanpa token{#if analisis} · {new Date(analisis.dibuat).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{/if}
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
		<div class="p-5 grid md:grid-cols-3 gap-5 animate-pulse">
			<div class="h-36 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
			<div class="h-36 rounded-xl bg-slate-100 dark:bg-slate-800 md:col-span-2"></div>
		</div>
	{:else}
		<div in:fade={{ duration: 200 }}>
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
									<div class="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400"><span class="truncate">{c.nama}</span><span>{c.skor}</span></div>
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
					{#if analisis.titikImpas}
						<div class="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
							<div class="flex justify-between text-[10px]"><span class="font-bold text-slate-600 dark:text-slate-300">Titik impas</span><span class="font-mono text-slate-700 dark:text-slate-200">{rpSingkat(analisis.titikImpas.bulanan)}/bln · {rpSingkat(analisis.titikImpas.harian)}/hari</span></div>
							{#if analisis.titikImpas.aman !== null}<p class="text-[10px] mt-0.5 {analisis.titikImpas.aman >= 15 ? 'text-emerald-600' : analisis.titikImpas.aman >= 0 ? 'text-amber-600' : 'text-rose-600'}">Perkiraan omzet {analisis.titikImpas.aman >= 0 ? `${analisis.titikImpas.aman}% di atas` : `${Math.abs(analisis.titikImpas.aman)}% di bawah`} titik impas</p>{/if}
						</div>
					{/if}
				</div>

				<!-- Prediksi -->
				<div class="md:col-span-3">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Perkiraan omzet bulan ini</p>
							<p class="text-lg sm:text-xl font-black text-slate-800 dark:text-white">{rp(p.akhirBulan.nilai)}</p>
							<p class="text-[10px] text-slate-500 dark:text-slate-400">kisaran {rpSingkat(p.akhirBulan.bawah)} – {rpSingkat(p.akhirBulan.atas)} · bulan lalu {rpSingkat(p.akhirBulan.bulanLalu)}</p>
						</div>
						<div class="text-right shrink-0 max-w-[45%]">
							<span class="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-bold text-slate-500 dark:text-slate-400 leading-snug">{p.metode}</span>
							<p class="text-[9px] mt-1 text-slate-400">{p.galatUji === null ? 'data belum cukup untuk uji akurasi' : `galat validasi ±${p.galatUji}%`}</p>
						</div>
					</div>
					<div class="mt-2">
						<div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" title="Sudah tercatat vs perkiraan akhir bulan"><div class="h-full bg-emerald-500 rounded-full" style="width:{capai}%"></div></div>
						<p class="text-[9px] text-slate-400 mt-1">Tercatat {rpSingkat(p.akhirBulan.aktualSejauhIni)} ({capai}% dari perkiraan)</p>
					</div>
					<div class="h-36 sm:h-40 mt-2"><canvas bind:this={kanvas} aria-label="Grafik omzet 28 hari dan prediksi 7 hari"></canvas></div>
				</div>
			</div>

			<!-- Tab -->
			<div class="px-4 sm:px-5 border-t border-slate-100 dark:border-slate-800 flex gap-1 overflow-x-auto" role="tablist">
				{#each TAB as t}
					<button type="button" role="tab" aria-selected={tab === t.kunci} on:click={() => (tab = t.kunci)}
						class="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold whitespace-nowrap border-b-2 -mb-px transition-colors {tab === t.kunci ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}">
						<svelte:component this={t.ikon} class="w-3.5 h-3.5" />{t.label}
						{#if t.kunci === 'wawasan'}<span class="ml-0.5 px-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px]">{analisis.wawasan.length}</span>{/if}
					</button>
				{/each}
			</div>

			<div class="p-4 sm:p-5">
				{#if tab === 'wawasan'}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
						{#each analisis.wawasan.slice(0, semuaWawasan ? 12 : 6) as w (w.judul)}
							{@const g = GAYA[/** @type {keyof typeof GAYA} */ (w.tipe)] || GAYA.info}
							<div class="flex gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
								<span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 {g.kelas}"><svelte:component this={g.ikon} class="w-3.5 h-3.5" /></span>
								<div class="min-w-0">
									<p class="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-snug">{w.judul}</p>
									<p class="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{w.isi}</p>
									{#if w.aksi}<p class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1 flex items-start gap-1"><ArrowRight class="w-3 h-3 mt-px shrink-0" />{w.aksi}</p>{/if}
								</div>
							</div>
						{:else}
							<p class="text-xs text-slate-400">Belum ada wawasan.</p>
						{/each}
					</div>
					{#if analisis.wawasan.length > 6}
						<button type="button" class="mt-3 text-[10px] font-bold text-indigo-600" on:click={() => (semuaWawasan = !semuaWawasan)}>{semuaWawasan ? 'Tampilkan lebih sedikit' : `Lihat ${analisis.wawasan.length - 6} wawasan lain`}</button>
					{/if}
				{:else if tab === 'kas'}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
						<div class="md:col-span-2">
							<p class={judulBagian}>Proyeksi saldo kas 30 hari</p>
							<div class="h-44"><canvas bind:this={kanvasKas} aria-label="Grafik proyeksi saldo kas 30 hari"></canvas></div>
							<p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Perkiraan omzet harian × (1 − biaya variabel {analisis.kas.rasioVariabel}%) dikurangi biaya tetap pada tanggal jatuh temponya.
								{#if analisis.kas.terendah}Titik terendah <b class={analisis.kas.terendah.saldo < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}>{rpSingkat(analisis.kas.terendah.saldo)}</b> pada {tglPendek(analisis.kas.terendah.tanggal)}.{/if}</p>
						</div>
						<div class="space-y-4 text-[10px]">
							<div>
								<p class={judulBagian}>Biaya tetap terdeteksi · {rpSingkat(analisis.biayaTetap.perBulan)}/bln</p>
								{#each analisis.biayaTetap.daftar as b}
									<div class="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
										<span class="text-slate-600 dark:text-slate-300 truncate capitalize">{b.ket.toLowerCase()} <span class="text-slate-400">({b.periode})</span></span>
										<span class="font-mono text-slate-700 dark:text-slate-200 shrink-0 ml-2">{rpSingkat(b.nominal)} · {tglPendek(b.berikutnya)}</span>
									</div>
								{:else}
									<p class="text-slate-400">Belum ada pengeluaran yang berulang teratur (mis. sewa, gaji, langganan).</p>
								{/each}
							</div>
							<div>
								<p class={judulBagian}>Ringkas</p>
								<p class="flex justify-between"><span class="text-slate-500">Saldo saat ini</span><b class="text-slate-700 dark:text-slate-200">{rp(analisis.kas.saldo)}</b></p>
								<p class="flex justify-between"><span class="text-slate-500">Arus bersih/hari (30 hr)</span><b class={analisis.kas.netHarian30 >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{rpSingkat(analisis.kas.netHarian30)}</b></p>
								<p class="flex justify-between"><span class="text-slate-500">Perkiraan pengeluaran bulan ini</span><b class="text-slate-700 dark:text-slate-200">{rpSingkat(p.pengeluaranAkhirBulan)}</b></p>
							</div>
						</div>
					</div>
				{:else if tab === 'produk'}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-5 text-[10px]">
						<div class="space-y-4">
							<div>
								<p class={judulBagian}>Kontribusi laba (90 hari)</p>
								{#each analisis.margin as m}
									<div class="mb-1.5">
										<div class="flex justify-between"><span class="text-slate-600 dark:text-slate-300 truncate">{m.nama}</span><span class="font-mono text-slate-700 dark:text-slate-200">{rpSingkat(m.laba)} · {m.marginPersen}%</span></div>
										<div class="h-1.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div class="h-full rounded bg-emerald-500" style="width:{(m.laba / maksLaba) * 100}%"></div></div>
									</div>
								{:else}<p class="text-slate-400">Isi harga beli produk agar margin bisa dihitung.</p>{/each}
							</div>
							<div>
								<p class={judulBagian}>Produk andalan (80% pendapatan)</p>
								{#each analisis.produk.kelasA as x}<p class="flex justify-between text-slate-600 dark:text-slate-300"><span class="truncate">{x.nama}</span><span class="font-mono">{x.porsi}%</span></p>{:else}<p class="text-slate-400">Belum ada penjualan produk.</p>{/each}
							</div>
						</div>
						<div class="space-y-4">
							<div>
								<p class={judulBagian}>Penggerak omzet 4 minggu</p>
								<p class="text-slate-500 dark:text-slate-400 mb-1.5">{rpSingkat(analisis.penggerak.masuk28)} vs {rpSingkat(analisis.penggerak.masuk28lalu)} sebelumnya</p>
								{#each analisis.penggerak.daftar as g}
									<div class="flex items-center gap-2 mb-1">
										<span class="w-20 shrink-0 truncate text-slate-600 dark:text-slate-300">{g.nama}</span>
										<div class="flex-1 h-2 relative bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
											<div class="absolute top-0 h-full {g.selisih >= 0 ? 'bg-emerald-500 left-1/2' : 'bg-rose-500 right-1/2'}" style="width:{(Math.abs(g.selisih) / maksGerak) * 50}%"></div>
										</div>
										<span class="shrink-0 whitespace-nowrap text-right font-mono {g.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{g.selisih >= 0 ? '+' : ''}{rpSingkat(g.selisih)}</span>
									</div>
								{:else}<p class="text-slate-400">Belum cukup data 8 minggu.</p>{/each}
							</div>
							{#if analisis.produk.naik.length || analisis.produk.turun.length}
								<div>
									<p class={judulBagian}>Pergerakan jumlah terjual 14 hari</p>
									{#each analisis.produk.naik as x}<p class="flex justify-between text-emerald-600"><span class="truncate">▲ {x.nama}</span><span>+{x.ubah}%</span></p>{/each}
									{#each analisis.produk.turun as x}<p class="flex justify-between text-rose-600"><span class="truncate">▼ {x.nama}</span><span>{x.ubah}%</span></p>{/each}
								</div>
							{/if}
						</div>
						<div class="space-y-4">
							<div>
								<p class={judulBagian}>Sering dibeli bersama (ide paket)</p>
								{#each analisis.bersamaan as b}
									<div class="py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
										<p class="text-slate-700 dark:text-slate-200 font-semibold">{b.jika} → {b.maka}</p>
										<p class="text-slate-400">{b.persen}% order · {b.lift}× dari kebetulan · {b.order} order</p>
									</div>
								{:else}<p class="text-slate-400">Butuh minimal 20 order kasir berisi beberapa produk.</p>{/each}
							</div>
							{#if analisis.produk.segeraHabis.length}
								<div>
									<p class={judulBagian}>Perkiraan habis & saran restock</p>
									{#each analisis.produk.segeraHabis as x}<p class="flex justify-between text-slate-600 dark:text-slate-300"><span class="truncate">{x.nama} <span class="text-slate-400">({x.stok})</span></span><span>{x.stok === 0 ? 'habis' : x.hari === null ? '—' : `±${x.hari} hr`} · +{x.restock}</span></p>{/each}
								</div>
							{/if}
							{#if analisis.produk.tidakLaku.length}
								<div>
									<p class={judulBagian}>Tidak terjual 30 hari</p>
									{#each analisis.produk.tidakLaku as x}<p class="flex justify-between text-slate-600 dark:text-slate-300"><span class="truncate">{x.nama} <span class="text-slate-400">({x.stok})</span></span><span>{rpSingkat(x.nilai)}</span></p>{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-5 text-[10px]">
						<div>
							<p class={judulBagian}>Rata-rata omzet per hari (8 minggu)</p>
							{#each analisis.pola as h}
								<div class="flex items-center gap-2 mb-1">
									<span class="w-12 text-slate-500 dark:text-slate-400">{h.hari}</span>
									<div class="flex-1 h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div class="h-full rounded bg-indigo-500" style="width:{(h.rata / maksPola) * 100}%"></div></div>
									<span class="w-14 text-right font-mono text-slate-600 dark:text-slate-300">{rpSingkat(h.rata)}</span>
								</div>
							{/each}
							<p class="mt-2 text-slate-500 dark:text-slate-400 flex items-center gap-1">
								{#if analisis.tren.perMinggu >= 0}<TrendingUp class="w-3 h-3 text-emerald-500" />{:else}<TrendingDown class="w-3 h-3 text-rose-500" />{/if}
								Tren 4 minggu {analisis.tren.perMinggu > 0 ? '+' : ''}{analisis.tren.perMinggu}%/minggu (R² {analisis.tren.r2})
							</p>
							{#if analisis.gajian}<p class="mt-1 text-slate-500 dark:text-slate-400">Efek gajian (tgl 25–5): {analisis.gajian.ubah > 0 ? '+' : ''}{analisis.gajian.ubah}% (t = {analisis.gajian.t})</p>{/if}
							{#if analisis.perubahan}<p class="mt-1 text-slate-500 dark:text-slate-400">Titik perubahan: {tglPendek(analisis.perubahan.tanggal)} ({analisis.perubahan.ubah > 0 ? '+' : ''}{analisis.perubahan.ubah}%)</p>{/if}
						</div>
						<div>
							<p class={judulBagian}>Order kasir per jam (30 hari)</p>
							{#if analisis.jamRamai}
								<div class="flex items-end gap-px h-24">
									{#each analisis.jamRamai.perJam as v, j}
										<div class="flex-1 rounded-t {j >= analisis.jamRamai.mulai && j < analisis.jamRamai.mulai + 2 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}" style="height:{Math.max(v ? 4 : 0, (v / maksJam) * 100)}%" title="{j}.00: {v} order"></div>
									{/each}
								</div>
								<div class="flex justify-between text-[8px] text-slate-400 mt-1"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
								<p class="mt-2 text-slate-500 dark:text-slate-400">Puncak {String(analisis.jamRamai.mulai).padStart(2, '0')}.00–{String(analisis.jamRamai.akhir).padStart(2, '0')}.00 ({analisis.jamRamai.porsi}% order)</p>
							{:else}
								<p class="text-slate-400">Butuh minimal 30 order kasir dalam 30 hari.</p>
							{/if}
							<p class="{judulBagian} mt-4">Hari tidak biasa (14 hari)</p>
							{#each analisis.anomali as a}
								<div class="py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
									<p class="font-bold {a.arah === 'turun' ? 'text-rose-600' : a.jenis === 'pengeluaran' ? 'text-amber-600' : 'text-emerald-600'}">{tglPendek(a.tanggal)} · {a.jenis} {a.arah === 'naik' ? 'melonjak' : 'anjlok'}</p>
									<p class="text-slate-500 dark:text-slate-400">{rp(a.nilai)} (biasanya ±{rpSingkat(a.normal)}){a.penyebab ? ` · ${a.penyebab}` : ''}</p>
								</div>
							{:else}
								<p class="text-slate-400">{p.kepadatan < 60 ? 'Pencatatan belum harian — deteksi dimatikan agar tidak salah tanda.' : 'Tidak ada yang janggal. 👍'}</p>
							{/each}
						</div>
						<div>
							<p class={judulBagian}>Kompetisi model peramalan</p>
							<table class="w-full">
								<thead><tr class="text-slate-400 text-left"><th class="font-semibold pb-1">Model</th><th class="font-semibold pb-1 text-right">Galat</th><th class="font-semibold pb-1 text-right">Bobot</th></tr></thead>
								<tbody>
									{#each p.model || [] as m}
										<tr class={m.dipakai ? 'text-slate-700 dark:text-slate-200 font-semibold' : 'text-slate-400'}>
											<td class="py-0.5">{m.dipakai ? '✓ ' : ''}{m.nama}</td><td class="text-right font-mono">{m.galat}%</td><td class="text-right font-mono">{m.bobot}%</td>
										</tr>
									{:else}
										<tr><td colspan="3" class="text-slate-400">Data belum cukup (butuh ≥ 3 minggu).</td></tr>
									{/each}
								</tbody>
							</table>
							<p class="mt-3 text-[9px] text-slate-400 leading-snug">Galat = WAPE validasi silang bergulir (3 × 7 hari). Model dengan galat ≤ 1,15× terbaik digabung, bobot ∝ 1/galat². Kisaran = persentil 10–90 galat validasi. Data {p.hariData} hari, kepadatan pencatatan {p.kepadatan}%.</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>
