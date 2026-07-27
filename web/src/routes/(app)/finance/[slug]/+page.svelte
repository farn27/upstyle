<script>
  import { invalidate, goto } from '$app/navigation';
  import { fade, scale, slide } from 'svelte/transition';
  import Chart from 'chart.js/auto';
  import { page } from '$app/stores';
  import { onMount, onDestroy, tick } from 'svelte';
  import { getPusherClient } from '$lib/pusher';
  import { createRealtimeManager, PollingManager } from '$lib/polling';
  import PageLayout from '$lib/components/PageLayout.svelte';
  import StockAlertBanner from '$lib/components/StockAlertBanner.svelte';
  import {
    Coins,
    ArrowUpRight,
    ArrowDownLeft,
    Percent,
    TrendingUp,
    ShieldAlert,
    Sparkles,
    Clock,
    Activity,
    AlertCircle
  } from 'lucide-svelte';

  export let data;

  // --- 1. STATE UI ---
  let showKasDetail = false;     
  let showLabaRugiDetail = false;
  let teksAnalisisAI = "";    
  let healthScore = 0;   
  let forecastLaba = 0;
  let operationalVelocity = "MODERATE";
  let modeGrafik = "arusKas"; 

  // --- 2. DATA DARI SERVER ---
  let unit = data.unit;
  let transactions = data.transactions || []; 
  let summary = data.summary || {};
  let riwayat = data.riwayat || [];
  $: slug = $page.params.slug;

  $: {
      if (data.unit) unit = data.unit;
      if (data.transactions && data.transactions !== transactions) transactions = data.transactions;
      if (data.summary && data.summary !== summary) summary = data.summary;
      if (data.riwayat) riwayat = data.riwayat;
  }

  $: products = data.products || [];
  $: alerts = data.alerts || { receivables: [], payables: [], lowStock: [] };
  $: bankBalances = data.bankBalances || [];
  $: kpi = data.kpi || { target: 1, current: 0 };
  $: startDate = data.startDate;
  $: endDate = data.endDate;

  // --- 3. LOGIKA KEUANGAN ---
  $: modalAwal = Number(unit?.modal_awal) || 0;
  $: totalMasuk = Number(summary.total_masuk) || 0;
  $: totalKeluar = Number(summary.total_keluar) || 0;
  $: totalHpp = Number(summary.total_hpp) || 0;
  $: selisih = totalMasuk - totalKeluar; // Arus Kas Bersih
  $: labaKotor = totalMasuk - totalHpp;
  $: saldoSaatIni = modalAwal + selisih;
  $: persentaseLaba = totalMasuk > 0 ? (selisih / totalMasuk) * 100 : 0;
  $: kpiProgress = Math.min((kpi.current / kpi.target) * 100, 100);

  // --- 4. FILTER & PRESET ---
  let activePreset = "Hari Ini";
  let selectedKategori = "";
  let sDate = "";
  let eDate = "";

  $: if (startDate) sDate = startDate;
  $: if (endDate) eDate = endDate;

  async function handleFilter() {
    const url = new URL(window.location.href);
    if (sDate) url.searchParams.set('start', sDate);
    if (eDate) url.searchParams.set('end', eDate);
    if (selectedKategori) url.searchParams.set('kategori', selectedKategori);
    else url.searchParams.delete('kategori');
    
    await goto(url.pathname + url.search, { keepFocus: true, noScroll: true, replaceState: true, invalidateAll: true });
  }

  function setPreset(p) {
    activePreset = p;
    const now = new Date();
    let start = new Date();
    
    if (p === 'Hari Ini') {} 
    else if (p === 'Kemarin') { start.setDate(now.getDate() - 1); now.setDate(now.getDate() - 1); } 
    else if (p === '7 Hari') { start.setDate(now.getDate() - 7); } 
    else if (p === 'Bulan Ini') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    
    const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    sDate = formatDate(start); eDate = formatDate(now);
    handleFilter();
  }

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  // --- 5. LOGIKA INSIGHT AI ---
  $: {
    const opex = totalKeluar - totalHpp;
    const omzet = totalMasuk;
    const hariBerjalan = new Date().getDate();
    const runRate = omzet / (hariBerjalan || 1);
    forecastLaba = (runRate * 30) - ((totalKeluar / (hariBerjalan || 1)) * 30);

    let points = 0;
    if (persentaseLaba > 20) points += 40; else if (persentaseLaba > 0) points += 20;
    if (omzet > totalKeluar && omzet > 0) points += 30; 
    if (totalHpp > opex) points += 30; 
    healthScore = points;
    operationalVelocity = omzet > (modalAwal * 0.3) ? "HIGH" : "STABLE";

    if (omzet === 0) teksAnalisisAI = `Menunggu data operasional periode ${activePreset} untuk kalkulasi.`;
    else if (selisih < 0) teksAnalisisAI = `DEFISIT ARUS KAS: Burn-rate ${formatIDR(Math.abs(selisih / hariBerjalan))}/hari. Pangkas pengeluaran operasional (OPEX) segera untuk menjaga likuiditas.`;
    else if (opex > totalHpp && totalHpp > 0) teksAnalisisAI = `EFISIENSI BURUK: Biaya Operasional lebih tinggi dari HPP barang terjual. Evaluasi pengeluaran bulanan.`;
    else teksAnalisisAI = `OPTIMAL: Performa efisien dengan Health Score ${healthScore}/100. Struktur biaya unit terpantau sangat sehat.`;
  }

  // --- 6. CHART ENGINE ---
  let chartCanvas;
  let myChart = null;

  $: if (chartCanvas && transactions && modeGrafik) {
      tick().then(() => updateChart());
  }

  function updateChart() {
      if (!chartCanvas) return;
      if (myChart) { myChart.destroy(); myChart = null; }
      if (!transactions || transactions.length === 0) return;

      if (modeGrafik === "arusKas") {
          const isDaily = (activePreset === 'Hari Ini' || activePreset === 'Kemarin');
          const dataGroup = {};
          
          transactions.forEach(t => {
              const d = new Date(t.tanggal);
              if (isDaily) d.setMinutes(0, 0, 0); else d.setHours(0, 0, 0, 0);
              const timeKey = d.getTime(); 
              if (!dataGroup[timeKey]) dataGroup[timeKey] = { masuk: 0, keluar: 0, dateObject: d };

              const kat = (t.kategoriTrx || t.kategori_trx || "").toLowerCase();
              if (kat.includes('masuk')) dataGroup[timeKey].masuk += Number(t.nominal);
              else if (kat.includes('keluar')) dataGroup[timeKey].keluar += Number(t.nominal);
          });

          const sortedTimestamps = Object.keys(dataGroup).sort((a, b) => Number(a) - Number(b));
          const namaBulanIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

          const sortedLabels = sortedTimestamps.map(ts => {
              const date = dataGroup[ts].dateObject;
              const tgl = String(date.getDate()).padStart(2, '0');
              const bln = namaBulanIndo[date.getMonth()];
              const jam = String(date.getHours()).padStart(2, '0');
              return isDaily ? `${jam}:00` : `${tgl} ${bln}`;
          });

          const datasets = [];
          if (selectedKategori === "" || selectedKategori === "MASUK") {
              datasets.push({
                  label: 'Pemasukan', data: sortedTimestamps.map(ts => dataGroup[ts].masuk),
                  borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.02)', 
                  borderWidth: 2, tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 6
              });
          }
          if (selectedKategori === "" || selectedKategori === "KELUAR") {
              datasets.push({
                  label: 'Pengeluaran', data: sortedTimestamps.map(ts => dataGroup[ts].keluar),
                  borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.02)', 
                  borderWidth: 2, tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 6
              });
          }

          const ctx = chartCanvas.getContext('2d');
          myChart = new Chart(ctx, {
              type: 'line',
              data: { labels: sortedLabels, datasets },
              options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { display: false } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } } } }
          });
      } else if (modeGrafik === "produkTerlaris") {
          const productStats = {};
          transactions.forEach(t => {
              if (t.productId && (t.kategoriTrx || "").toLowerCase().includes('masuk')) {
                  const pObj = products.find(p => p.id === t.productId);
                  const pNama = pObj ? pObj.nama : `ID ${t.productId}`;
                  if (!productStats[t.productId]) productStats[t.productId] = { id: t.productId, nama: pNama, total: 0 };
                  productStats[t.productId].total += Number(t.nominal);
              }
          });

          const topProducts = Object.values(productStats).sort((a,b) => b.total - a.total).slice(0, 5);
          if (topProducts.length === 0) return;

          const ctx = chartCanvas.getContext('2d');
          myChart = new Chart(ctx, {
              type: 'bar',
              data: { labels: topProducts.map(p => p.nama), datasets: [{ label: 'Pendapatan', data: topProducts.map(p => p.total), backgroundColor: '#6366f1', borderRadius: 4 }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { display: false } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } } } }
          });
      }
  }

  // --- 7. REALTIME ENGINE ---
  let pusherClient;
  let realtimeManager;
  let lastUpdate = Date.now();

  async function checkUpdates() {
    try {
      const response = await fetch(`/api/updates?slug=${slug}&lastUpdate=${lastUpdate}&type=transactions`);
      const updates = await response.json();

      if (updates.transactions && updates.transactions.length > 0) {
        // Add new transactions to the list
        updates.transactions.forEach(newTrx => {
          const nominal = Number(newTrx.nominal);
          const kat = (newTrx.kategoriTrx || "").toLowerCase();

          if (kat.includes('masuk')) {
            summary.total_masuk = Number(summary.total_masuk) + nominal;
          } else {
            summary.total_keluar = Number(summary.total_keluar) + nominal;
          }

          transactions = [newTrx, ...transactions];
        });

        await invalidate('app:finance');
      }

      lastUpdate = updates.timestamp || Date.now();
    } catch (error) {
      console.error('[Polling] Error checking updates:', error);
    }
  }

  onMount(() => {
    // Try to use Pusher first, fall back to polling
    try {
      pusherClient = getPusherClient();
      const channelName = `finance-${unit.slug}`;
      const channel = pusherClient.subscribe(channelName);

      channel.bind('stats-updated', async (payload) => {
        if (payload.newTransaction) {
          transactions = [payload.newTransaction, ...transactions];
          const nominal = Number(payload.newTransaction.nominal);
          const kat = (payload.newTransaction.kategori || payload.newTransaction.kategori_trx || "").toLowerCase();

          if (kat.includes('masuk')) summary.total_masuk = Number(summary.total_masuk) + nominal;
          else summary.total_keluar = Number(summary.total_keluar) + nominal;
          await invalidate('app:finance');
        }
      });

      return () => {
        if (pusherClient) {
          pusherClient.unsubscribe(channelName);
          pusherClient.disconnect();
        }
      };
    } catch (pusherError) {
      console.warn('[Realtime] Pusher not available, falling back to polling:', pusherError);

      // Fallback to polling
      realtimeManager = new PollingManager({
        interval: 5000, // 5 seconds
        callback: checkUpdates,
        lastUpdate: lastUpdate
      });

      realtimeManager.start();

      return () => {
        if (realtimeManager) {
          realtimeManager.stop();
        }
      };
    }
  });

  onDestroy(() => { if (myChart) myChart.destroy(); });
</script>

<PageLayout {unit} {slug}>
    <svelte:fragment slot="actions">
        <a href="/finance/{slug}/entry" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2">
            <span class="text-lg leading-none">+</span> Tambah Transaksi
        </a>
    </svelte:fragment>

    <!-- Date presets mapped to the sticky sub-navigation actions slot -->
    <div slot="nav-actions" class="flex items-center gap-1 bg-slate-100 dark:bg-slate-955 p-0.5 rounded-lg shrink-0">
        {#each ['Hari Ini', 'Kemarin', '7 Hari', 'Bulan Ini'] as periode}
            <button type="button" on:click|preventDefault={() => setPreset(periode)} class="whitespace-nowrap px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all {activePreset === periode ? 'bg-white text-indigo-655 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100' }">{periode}</button>
        {/each}
    </div>

    <!-- Clean inline section header below sticky bar -->
    <div class="flex items-center gap-1.5 mb-4">
        <TrendingUp class="w-4 h-4 text-indigo-500 animate-pulse" />
        <h2 class="text-xs font-black text-slate-850 dark:text-white uppercase tracking-widest">
            Ringkasan Kinerja
        </h2>
    </div>

    <!-- Stock Alert Banner -->
    {#if unit?.id}
        <div class="mb-5">
            <StockAlertBanner unitId={unit.id} {slug} />
        </div>
    {/if}

    <!-- TOP SUMMARY CARDS (Sleek modern minimal layout) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        
        <!-- Card 1: Saldo Kas -->
        <button on:click={() => showKasDetail = true} class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all text-left group">
            <div class="flex justify-between items-start mb-2">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Saldo Kas Terpadu</p>
                <div class="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-slate-500">
                    <Coins class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xl font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors mt-2">{formatIDR(saldoSaatIni)}</p>
        </button>

        <!-- Card 2: Total Pemasukan -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Pemasukan</p>
                <div class="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-500">
                    <ArrowUpRight class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">{formatIDR(totalMasuk)}</p>
        </div>

        <!-- Card 3: Total Pengeluaran -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Pengeluaran</p>
                <div class="p-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg text-rose-500">
                    <ArrowDownLeft class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">{formatIDR(totalKeluar)}</p>
        </div>

        <!-- Card 4: Arus Kas Bersih -->
        <button on:click={() => showLabaRugiDetail = true} class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all text-left group">
            <div class="flex justify-between items-start mb-2">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Arus Kas Bersih</p>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider {selisih >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}">
                    {persentaseLaba.toFixed(1)}% MRG
                </span>
            </div>
            <p class="text-xl font-black mt-2 {selisih >= 0 ? 'text-emerald-650 dark:text-emerald-400' : 'text-rose-600'}">{formatIDR(selisih)}</p>
        </button>

    </div>

    <!-- MIDDLE ROW: CHARTS & INTELLIGENCE -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        
        <!-- LEFT PANEL: CHART & AI -->
        <div class="lg:col-span-8 flex flex-col gap-5">
            <!-- AI Intelligence Bar (Premium styled block, no loud full pink background) -->
            <div class="px-5 py-4.5 rounded-2xl border transition-all duration-500 {selisih < 0 ? 'bg-rose-50/50 dark:bg-rose-955/20 border-rose-200/60 dark:border-rose-900/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}">
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-650 to-indigo-650 text-white rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm">
                                <Sparkles class="w-2.5 h-2.5" />
                                AI INSIGHT
                            </span>
                            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kombinasi Finansial</span>
                        </div>
                        <h2 class="text-xs font-bold leading-relaxed {selisih < 0 ? 'text-rose-900 dark:text-rose-200' : 'text-slate-700 dark:text-slate-350'}">"{teksAnalisisAI}"</h2>
                    </div>
                </div>
            </div>

            <!-- Chart Engine -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden flex-1">
                <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <h3 class="text-[9px] font-black text-slate-850 dark:text-white uppercase tracking-widest">Grafik Analisis</h3>
                    <div class="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-1">
                        <button on:click={() => modeGrafik = "arusKas"} class="px-3.5 py-1 text-[8px] font-black rounded-md transition-all {modeGrafik === 'arusKas' ? 'bg-white dark:bg-slate-900 text-indigo-650 shadow-sm' : 'text-slate-400 dark:text-slate-500'} uppercase">CASH</button>
                        <button on:click={() => modeGrafik = "produkTerlaris"} class="px-3.5 py-1 text-[8px] font-black rounded-md transition-all {modeGrafik === 'produkTerlaris' ? 'bg-white dark:bg-slate-900 text-indigo-650 shadow-sm' : 'text-slate-400 dark:text-slate-500'} uppercase">ITEMS</button>
                    </div>
                </div>
                <div class="p-5 h-64 relative">
                    {#if modeGrafik === 'produkTerlaris' && (!transactions || transactions.length === 0)}
                        <div class="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Belum Ada Data Terlaris</div>
                    {/if}
                    <canvas bind:this={chartCanvas}></canvas>
                </div>
            </div>
        </div>

        <!-- RIGHT PANEL: KPI & RISK ASSESS -->
        <div class="lg:col-span-4 flex flex-col gap-5">
            <!-- Monthly Revenue Target -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm text-center flex flex-col justify-between h-1/2">
                <h3 class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly Revenue Target</h3>
                <div class="relative w-28 h-28 mx-auto flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="8"></circle>
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="{kpiProgress >= 100 ? '#10b981' : '#6366f1'}" stroke-width="8" stroke-dasharray="251.2" stroke-dashoffset="{251.2 - (251.2 * kpiProgress) / 100}" stroke-linecap="round" class="transition-all duration-1000"></circle>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-xl font-black text-slate-850 dark:text-white">{kpiProgress.toFixed(0)}%</span>
                    </div>
                </div>
                <p class="text-[8px] font-mono font-bold text-slate-500 dark:text-slate-450 uppercase mt-2">{formatIDR(kpi.current)} / {formatIDR(kpi.target)}</p>
            </div>

            <!-- Risk Assessment Panel (Sleek dark gradient box) -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-850 p-5 text-white flex-col justify-between flex-1 shadow-lg relative overflow-hidden">
                <div class="absolute -right-10 -top-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Risk Assessment</h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-end">
                        <div>
                            <p class="text-[8px] font-black text-slate-500 uppercase tracking-wider">Health Score</p>
                            <div class="flex items-end gap-1 mt-1">
                                <span class="text-2xl font-black {healthScore > 70 ? 'text-emerald-400' : 'text-rose-455'}">{healthScore}</span>
                                <span class="text-[9px] font-bold text-slate-500 mb-1">/ 100</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-[8px] font-black text-slate-500 uppercase tracking-wider">Cost Ratio</p>
                            <p class="text-base font-black text-indigo-400 mt-1">{totalKeluar > 0 ? (((totalKeluar-totalHpp)/(totalMasuk||1))*100).toFixed(0) : 0}%</p>
                        </div>
                    </div>
                    
                    <div class="pt-3 border-t border-white/5">
                        <p class="text-[8px] font-black text-slate-500 uppercase tracking-wider">Projected EOM Cash Flow</p>
                        <p class="text-base font-black mt-1 {forecastLaba >= 0 ? 'text-emerald-450' : 'text-rose-455'}">
                            {formatIDR(forecastLaba).replace(',00', '')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- BOTTOM ROW: BANK, ALERTS, AUDIT LOG (Unified heights of exactly 360px) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-10">
        
        <!-- COL 1: BANK & LOW STOCK (h-[360px]) -->
        <div class="lg:col-span-4 flex flex-col gap-4 h-[360px]">
            <!-- Bank Balances -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                    <h3 class="text-[9px] font-black text-slate-850 dark:text-white uppercase tracking-widest">Rincian Kas & Bank</h3>
                </div>
                <div class="p-5 space-y-3 flex-1 overflow-y-auto custom-scroll">
                    {#if bankBalances.length === 0}
                        <p class="text-xs text-slate-400 dark:text-slate-500 italic">Belum ada data saldo terperinci.</p>
                    {/if}
                    {#each bankBalances as bank}
                        <div class="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-2 last:border-0 last:pb-0">
                            <span class="text-xs font-bold text-slate-650 dark:text-slate-350">{bank.nama}</span>
                            <span class="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{formatIDR(bank.saldo)}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Low Stock Alerts (Pushed inside flex column) -->
            {#if alerts.lowStock.length > 0}
                <div class="bg-amber-50/75 dark:bg-amber-955/20 border border-amber-200/70 dark:border-amber-900/30 p-4.5 rounded-2xl shrink-0">
                    <div class="flex items-center gap-2 mb-2">
                        <AlertCircle class="w-4 h-4 text-amber-600" />
                        <h3 class="text-[9px] font-black text-amber-805 uppercase tracking-widest">Stok Menipis ({alerts.lowStock.length})</h3>
                    </div>
                    <div class="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scroll">
                        {#each alerts.lowStock as p}
                            <div class="flex justify-between items-center text-[10px]">
                                <span class="text-amber-900 dark:text-amber-200 font-bold truncate max-w-[180px]">{p.nama}</span>
                                <span class="text-[8px] bg-amber-100 dark:bg-amber-900 text-amber-700 px-2 py-0.5 rounded font-black">Sisa {p.stok}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- COL 2: AR/AP ALERTS & TRANSACTIONS (h-[360px]) -->
        <div class="lg:col-span-4 flex flex-col gap-4 h-[360px]">
            <!-- AR / AP -->
            {#if alerts.receivables.length > 0 || alerts.payables.length > 0}
                <div class="bg-rose-50/70 dark:bg-rose-955/10 border border-rose-200/60 dark:border-rose-900/30 p-4.5 rounded-2xl shrink-0">
                    <h3 class="text-[9px] font-black text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        Tagihan Jatuh Tempo!
                    </h3>
                    <div class="space-y-2">
                        {#if alerts.receivables.length > 0}
                            <div class="bg-white/70 p-2.5 rounded-xl border border-rose-100/50 flex justify-between items-center text-[10px]">
                                <span class="font-bold text-rose-900">{alerts.receivables.length} Piutang Pelanggan</span>
                                <a href={`/finance/${slug}/piutang`} class="text-[8px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-md hover:bg-rose-700">TINJAU</a>
                            </div>
                        {/if}
                        {#if alerts.payables.length > 0}
                            <div class="bg-white/70 p-2.5 rounded-xl border border-rose-100/50 flex justify-between items-center text-[10px]">
                                <span class="font-bold text-rose-900">{alerts.payables.length} Hutang Supplier</span>
                                <a href={`/finance/${slug}/hutang`} class="text-[8px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-md hover:bg-rose-700">TINJAU</a>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Live Transactions table -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-855 flex justify-between items-center bg-slate-50/50 dark:bg-slate-955/20 shrink-0">
                    <h3 class="text-[9px] font-black text-slate-850 dark:text-white uppercase tracking-widest">Transaksi (Live)</h3>
                    <a href={`/finance/${slug}/history`} class="text-[8px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors uppercase tracking-widest">Lihat Detail</a>
                </div>
                <div class="flex-1 overflow-y-auto custom-scroll">
                    <table class="w-full text-left">
                        <tbody class="divide-y divide-slate-50 dark:divide-slate-850">
                            {#if transactions.length === 0}
                                <tr><td class="p-6 text-center text-xs text-slate-400 dark:text-slate-500">Belum ada transaksi.</td></tr>
                            {/if}
                            {#each transactions.slice(0, 8) as trx (trx.id)}
                                {@const isMasuk = (trx.kategoriTrx || trx.kategori_trx || "").toLowerCase().includes('masuk')}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                                    <td class="px-5 py-2.5">
                                        <p class="text-[10px] font-bold text-slate-700 dark:text-slate-250 uppercase tracking-tight line-clamp-1">{trx.keterangan}</p>
                                        <p class="text-[8px] text-slate-450 dark:text-slate-500 mt-0.5">{new Date(trx.tanggal).toLocaleDateString('id-ID')} • {trx.metode_bayar || 'KAS'}</p>
                                    </td>
                                    <td class="px-5 py-2.5 text-right">
                                        <span class="text-[10px] font-black font-mono {isMasuk ? 'text-emerald-650' : 'text-rose-650'}">
                                            {isMasuk ? '+' : '-'}{formatIDR(trx.nominal)}
                                        </span>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- COL 3: AUDIT LOG (h-[360px] flex-col) -->
        <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[360px]">
            <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between shrink-0">
                <h3 class="text-[9px] font-black text-slate-850 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Clock class="w-3.5 h-3.5 text-slate-400" />
                    Audit Log Sistem
                </h3>
            </div>
            <div class="p-5 flex-1 overflow-y-auto space-y-4 custom-scroll">
                {#if riwayat.length === 0}
                    <p class="text-xs text-slate-400 dark:text-slate-500 text-center py-5 italic">Sistem belum mencatat aktivitas.</p>
                {/if}
                {#each riwayat as log}
                    <div class="flex gap-3 relative before:absolute before:left-1 before:top-4 before:bottom-[-16px] before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800 last:before:hidden">
                        <div class="w-2 h-2 rounded-full mt-1 shrink-0 relative z-10 {log.tipe === 'DELETE' ? 'bg-rose-500' : log.tipe === 'UPDATE' ? 'bg-amber-500' : 'bg-indigo-500'}"></div>
                        <div>
                            <p class="text-[10px] font-medium text-slate-700 dark:text-slate-350 leading-snug">{log.pesan}</p>
                            <p class="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{new Date(log.waktu).toLocaleString('id-ID', { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short' })}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</PageLayout>

<style>
  .custom-scroll::-webkit-scrollbar { width: 3px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb { background: #334155; }
</style>