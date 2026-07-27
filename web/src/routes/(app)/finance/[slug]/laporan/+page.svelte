<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    const { unit, tahun, bulan, dashboard, labaRugi, neraca } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    const validTabs = ['dashboard', 'labarugi', 'neraca', 'aruskas'];
    let activeTab = 'dashboard';

    $: {
        const tabParam = $page.url.searchParams.get('tab');
        if (tabParam && validTabs.includes(tabParam)) {
            activeTab = tabParam;
        }
    }

    let barChartCanvas;
    let doughnutChartCanvas;
    let barChart;
    let doughnutChart;

    onMount(() => {
        if (activeTab === 'dashboard') initCharts();
    });

    $: if (activeTab === 'dashboard' && barChartCanvas && doughnutChartCanvas) {
        // Re-init chart when tab switches back, but with slight delay for DOM
        setTimeout(initCharts, 0);
    }

    function initCharts() {
        if (!barChartCanvas || !doughnutChartCanvas) return;

        // Destroy old instances
        if (barChart) barChart.destroy();
        if (doughnutChart) doughnutChart.destroy();

        // 1. Bar Chart (Arus Kas)
        const labels = dashboard.arusKas.map(k => new Date(2000, k.bulan - 1).toLocaleDateString('id-ID', { month: 'short' }));
        const masukData = dashboard.arusKas.map(k => k.masuk);
        const keluarData = dashboard.arusKas.map(k => k.keluar);

        barChart = new Chart(barChartCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: masukData,
                        backgroundColor: '#6366f1', // indigo-500
                        borderRadius: 4
                    },
                    {
                        label: 'Pengeluaran',
                        data: keluarData,
                        backgroundColor: '#f43f5e', // rose-500
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // 2. Doughnut Chart (Metode Bayar)
        const metodeLabels = dashboard.metodeBayarStats.map(m => m.metode);
        const metodeData = dashboard.metodeBayarStats.map(m => m.total);
        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

        doughnutChart = new Chart(doughnutChartCanvas, {
            type: 'doughnut',
            data: {
                labels: metodeLabels.length ? metodeLabels : ['Belum Ada'],
                datasets: [{
                    data: metodeData.length ? metodeData : [1],
                    backgroundColor: metodeData.length ? colors : ['#e2e8f0'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    function handleFilter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const y = formData.get('tahun');
        const m = formData.get('bulan');
        window.location.href = `/finance/${slug}/laporan?tahun=${y}&bulan=${m}`;
    }
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Laporan / Keuangan Pusat</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Pusat Laporan & Analisis</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Dashboard analitik bisnis operasional dan laporan keuangan formal (Akuntansi).</p>
        </div>
    </div>

    <div class="sticky top-[60px] lg:top-20 z-20 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-2 pb-4 space-y-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <SubNav {slug} />

        <!-- Filter Header -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 flex flex-col xl:flex-row justify-between items-center gap-4">
            <form on:submit={handleFilter} class="flex gap-3 items-end">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Bulan</label>
                    <select name="bulan" class="w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium">
                        <option value="all" selected={bulan === 'all'}>Semua Bulan (Tahunan)</option>
                        {#each Array(12).fill(0) as _, i}
                            <option value={i+1} selected={bulan == (i+1)}>{new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tahun</label>
                    <select name="tahun" class="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-medium">
                        <option value={tahun}>{tahun}</option>
                        <option value={tahun-1}>{tahun-1}</option>
                        <option value={tahun-2}>{tahun-2}</option>
                    </select>
                </div>
                <button type="submit" class="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-sm font-bold hover:bg-indigo-100 transition shadow-sm">Terapkan</button>
            </form>

            <div class="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg w-full xl:w-auto overflow-x-auto">
                <button on:click={() => activeTab = 'dashboard'} class="whitespace-nowrap px-4 py-1.5 text-sm font-bold rounded-md transition {activeTab === 'dashboard' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}">Dashboard Analisis</button>
                <button on:click={() => activeTab = 'labarugi'} class="whitespace-nowrap px-4 py-1.5 text-sm font-bold rounded-md transition {activeTab === 'labarugi' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}">Laba Rugi Formal</button>
                <button on:click={() => activeTab = 'neraca'} class="whitespace-nowrap px-4 py-1.5 text-sm font-bold rounded-md transition {activeTab === 'neraca' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}">Neraca (Balance Sheet)</button>
            </div>
        </div>
    </div>

    <!-- DASHBOARD ANALISIS (TAB 1) -->
    <div class={activeTab === 'dashboard' ? 'block space-y-6' : 'hidden'}>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
                <div class="absolute right-0 top-0 opacity-10">
                    <svg class="w-32 h-32 -mr-8 -mt-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                <p class="text-xs font-medium text-indigo-100 mb-1">Total Pemasukan (Gross)</p>
                <p class="text-3xl font-black font-mono">{rp(dashboard.summary.totalMasuk)}</p>
                <p class="text-xs text-indigo-200 mt-2">{dashboard.summary.jumlahTrx} Transaksi</p>
            </div>
            
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Total Pengeluaran</p>
                <p class="text-3xl font-black text-rose-600 font-mono">{rp(dashboard.summary.totalKeluar)}</p>
            </div>

            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Harga Pokok (HPP)</p>
                <p class="text-3xl font-black text-amber-600 font-mono">{rp(dashboard.summary.totalHpp)}</p>
            </div>

            <div class="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm">
                <p class="text-xs font-bold text-emerald-700 mb-1">Laba Kotor Transaksi</p>
                <p class="text-3xl font-black text-emerald-700 font-mono">{rp(dashboard.summary.labaKotor)}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Bar Chart: Arus Kas -->
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100">Tren Pemasukan & Pengeluaran ({tahun})</h3>
                </div>
                <div class="h-[300px] w-full">
                    <canvas bind:this={barChartCanvas}></canvas>
                </div>
            </div>

            <!-- Doughnut Chart: Metode Pembayaran -->
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 mb-6">Distribusi Metode Bayar</h3>
                <div class="h-[250px] w-full flex-1 flex items-center justify-center relative">
                    <canvas bind:this={doughnutChartCanvas}></canvas>
                    {#if dashboard.metodeBayarStats.length === 0}
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span class="text-sm text-slate-400 dark:text-slate-500">Belum ada data</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Riwayat Transaksi -->
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                <div class="p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100">Riwayat Transaksi Terbaru</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            <tr>
                                <th class="py-3 px-5">No. Referensi</th>
                                <th class="py-3 px-5">Tanggal</th>
                                <th class="py-3 px-5">Kategori</th>
                                <th class="py-3 px-5 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-sm">
                            {#if dashboard.riwayatTrx.length === 0}
                                <tr>
                                    <td colspan="4" class="py-8 text-center text-slate-400 dark:text-slate-500">Belum ada transaksi.</td>
                                </tr>
                            {/if}
                            {#each dashboard.riwayatTrx as trx}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
                                    <td class="py-3 px-5 font-bold text-slate-800 dark:text-slate-100">{trx.referensi}</td>
                                    <td class="py-3 px-5 text-slate-600 dark:text-slate-300">{new Date(trx.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td class="py-3 px-5">
                                        <span class="px-2 py-1 text-[10px] font-bold rounded-full {trx.kategoriTrx === 'MASUK' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                            {trx.kategoriTrx}
                                        </span>
                                    </td>
                                    <td class="py-3 px-5 text-right font-mono font-bold {trx.kategoriTrx === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}">
                                        {trx.kategoriTrx === 'MASUK' ? '+' : '-'}{rp(trx.nominal)}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Top Products -->
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 mb-5">Produk Terlaris (Top 5)</h3>
                <div class="space-y-5">
                    {#if dashboard.produkTerlaris.length === 0}
                        <p class="text-sm text-slate-400 dark:text-slate-500">Belum ada data penjualan produk.</p>
                    {/if}
                    {#each dashboard.produkTerlaris as p, idx}
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-black flex items-center justify-center text-sm">
                                {idx + 1}
                            </div>
                            <div class="flex-1">
                                <p class="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{p.namaProduk || 'Unknown Item'}</p>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{p.totalQty} item terjual</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-mono font-bold text-indigo-600">{rp(p.totalRevenue)}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <!-- LAPORAN LABA RUGI -->
    {#if activeTab === 'labarugi'}
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-center relative">
                <h2 class="text-xl font-black text-slate-800 dark:text-slate-100">Laporan Laba Rugi</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Periode: {bulan === 'all' ? 'Tahun' : 'Bulan ke-'} {bulan === 'all' ? tahun : `${bulan} ${tahun}`}</p>
                <span class="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-1 rounded">DOUBLE-ENTRY STANDARD</span>
            </div>
            
            <div class="p-6 md:p-8 space-y-6 text-sm">
                <!-- Pendapatan -->
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 border-b-2 border-slate-800 pb-2 mb-3 uppercase tracking-wider text-xs">Pendapatan Usaha</h3>
                    <div class="space-y-2">
                        {#if labaRugi.pendapatan.length === 0}
                            <p class="text-slate-400 dark:text-slate-500 italic text-xs">Tidak ada data pendapatan.</p>
                        {/if}
                        {#each labaRugi.pendapatan as akun}
                            <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                <span>{akun.namaAkun} <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-2">[{akun.kodeAkun}]</span></span>
                                <span class="font-mono">{rp(akun.saldo)}</span>
                            </div>
                        {/each}
                    </div>
                    <div class="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span>Total Pendapatan</span>
                        <span class="font-mono">{rp(labaRugi.totalPendapatan)}</span>
                    </div>
                </div>

                <!-- HPP -->
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3 uppercase tracking-wider text-xs">Harga Pokok Penjualan (HPP)</h3>
                    <div class="space-y-2">
                        {#each labaRugi.hpp as akun}
                            <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                <span>{akun.namaAkun} <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-2">[{akun.kodeAkun}]</span></span>
                                <span class="font-mono">({rp(akun.saldo)})</span>
                            </div>
                        {/each}
                    </div>
                    <div class="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span>Total HPP</span>
                        <span class="font-mono">({rp(labaRugi.totalHpp)})</span>
                    </div>
                </div>

                <!-- Laba Kotor -->
                <div class="flex justify-between items-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl">
                    <span class="uppercase tracking-widest text-xs">Laba Kotor Akuntansi</span>
                    <span class="font-mono text-lg">{rp(labaRugi.labaKotor)}</span>
                </div>

                <!-- Beban Operasional -->
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3 uppercase tracking-wider text-xs">Beban Operasional</h3>
                    <div class="space-y-2">
                        {#each labaRugi.beban as akun}
                            <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                <span>{akun.namaAkun} <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-2">[{akun.kodeAkun}]</span></span>
                                <span class="font-mono">({rp(akun.saldo)})</span>
                            </div>
                        {/each}
                    </div>
                    <div class="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span>Total Beban Operasional</span>
                        <span class="font-mono">({rp(labaRugi.totalBeban)})</span>
                    </div>
                </div>

                <!-- Laba Bersih -->
                <div class="flex justify-between items-center font-black text-white bg-slate-900 p-4 rounded-xl mt-8 shadow-lg">
                    <span class="uppercase tracking-widest text-xs">Laba Bersih Tahun Berjalan</span>
                    <span class="font-mono text-xl">{rp(labaRugi.labaBersih)}</span>
                </div>
            </div>
        </div>
    {/if}

    <!-- LAPORAN NERACA -->
    {#if activeTab === 'neraca'}
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-center relative">
                <h2 class="text-xl font-black text-slate-800 dark:text-slate-100">Neraca (Balance Sheet)</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Per: Akhir Periode {bulan === 'all' ? tahun : `${bulan} ${tahun}`}</p>
                <span class="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-1 rounded">DOUBLE-ENTRY STANDARD</span>
            </div>
            
            <div class="p-6 md:p-8 grid md:grid-cols-2 gap-12 text-sm">
                <!-- KOLOM KIRI: ASET -->
                <div class="space-y-6">
                    <h3 class="font-black text-slate-800 dark:text-slate-100 border-b-4 border-indigo-600 pb-2 text-lg">Aset</h3>
                    
                    <!-- Aset Lancar -->
                    <div>
                        <h4 class="font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">Aset Lancar</h4>
                        <div class="space-y-2">
                            {#each neraca.asetLancar as akun}
                                <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>{akun.namaAkun}</span>
                                    <span class="font-mono">{rp(akun.saldo)}</span>
                                </div>
                            {/each}
                        </div>
                        <div class="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs uppercase">
                            <span>Total Aset Lancar</span>
                            <span class="font-mono">{rp(neraca.totalAsetLancar)}</span>
                        </div>
                    </div>

                    <!-- TOTAL ASET -->
                    <div class="flex justify-between items-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl mt-8">
                        <span class="uppercase tracking-widest text-xs">Total Aset</span>
                        <span class="font-mono text-lg">{rp(neraca.totalAset)}</span>
                    </div>
                </div>

                <!-- KOLOM KANAN: LIABILITAS & EKUITAS -->
                <div class="space-y-6">
                    <h3 class="font-black text-slate-800 dark:text-slate-100 border-b-4 border-rose-600 pb-2 text-lg">Liabilitas & Ekuitas</h3>
                    
                    <!-- Liabilitas -->
                    <div>
                        <h4 class="font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">Liabilitas (Hutang)</h4>
                        <div class="space-y-2">
                            {#each neraca.liabilitasLancar as akun}
                                <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>{akun.namaAkun}</span>
                                    <span class="font-mono">{rp(akun.saldo)}</span>
                                </div>
                            {/each}
                            {#each neraca.liabilitasJangkaPanjang as akun}
                                <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>{akun.namaAkun}</span>
                                    <span class="font-mono">{rp(akun.saldo)}</span>
                                </div>
                            {/each}
                        </div>
                        <div class="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs uppercase">
                            <span>Total Liabilitas</span>
                            <span class="font-mono">{rp(neraca.totalLiabilitas)}</span>
                        </div>
                    </div>

                    <!-- Ekuitas -->
                    <div>
                        <h4 class="font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">Ekuitas Modal</h4>
                        <div class="space-y-2">
                            {#each neraca.ekuitas as akun}
                                <div class="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>{akun.namaAkun}</span>
                                    <span class="font-mono">{rp(akun.saldo)}</span>
                                </div>
                            {/each}
                            <div class="flex justify-between items-center text-indigo-600 font-bold bg-indigo-50/50 dark:bg-indigo-900/50 p-2 rounded">
                                <span>Laba Tahun Berjalan</span>
                                <span class="font-mono">{rp(labaRugi.labaBersih)}</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs uppercase">
                            <span>Total Ekuitas</span>
                            <span class="font-mono">{rp(neraca.totalEkuitas)}</span>
                        </div>
                    </div>

                    <!-- TOTAL LIABILITAS & EKUITAS -->
                    <div class="flex justify-between items-center font-black text-rose-700 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl mt-8">
                        <span class="uppercase tracking-widest text-xs">Total Liab. & Ekuitas</span>
                        <span class="font-mono text-lg">{rp(neraca.totalLiabilitas + neraca.totalEkuitas)}</span>
                    </div>

                    <!-- Balance Check -->
                    {#if Math.abs(neraca.totalAset - (neraca.totalLiabilitas + neraca.totalEkuitas)) < 1}
                        <div class="text-center text-emerald-600 font-bold text-xs uppercase tracking-widest mt-2 flex justify-center items-center gap-1">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                            Neraca Seimbang (Balanced)
                        </div>
                    {:else}
                        <div class="text-center text-red-600 font-bold text-xs uppercase tracking-widest mt-2 flex justify-center items-center gap-1">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            Unbalanced (Selisih: {rp(neraca.totalAset - (neraca.totalLiabilitas + neraca.totalEkuitas))})
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
