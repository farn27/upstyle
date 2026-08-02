<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
import Chart from 'chart.js/auto';
import RoleCashier from '../components/RoleCashier.svelte';
import RoleOperator from '../components/RoleOperator.svelte';
import RoleFinance from '../components/RoleFinance.svelte';
import RoleHR from '../components/RoleHR.svelte';
import RoleManager from '../components/RoleManager.svelte';
import RoleWarehouse from '../components/RoleWarehouse.svelte';
import RoleService from '../components/RoleService.svelte';
import RoleAdmin from '../components/RoleAdmin.svelte';
import RoleMarketing from '../components/RoleMarketing.svelte';
import RoleTechnical from '../components/RoleTechnical.svelte';
import RoleLogistics from '../components/RoleLogistics.svelte';
    export let data;

    // Data dari server
    /** @type {{ position?: string, full_name?: string, job_grade?: string, division?: string, role?: string }} */
    let employee = {};
    let roleCategory = 'employee';
    let role = 'employee';
    /** @type {{ nama_unit?: string, login_slug?: string, slug?: string }} */
    let unit = {};
    /** @type {any[]} */
    let transactions = [];
    let strategicBI = {
        aiConfidence: 0,
        outlook: '',
        margin: 0,
        suggestion: '',
        integrityScore: 0
    };
    let financeSlug = '';
    /** @type {HTMLCanvasElement | null} */
    let chartCanvas = null;
    let browserCookies = '';

    $: if (data) {
        employee = data.employee || {};
        roleCategory = data.roleCategory || 'employee';
        unit = data.unit || {};
        transactions = /** @type {any[]} */ (data.transactions || []);
        strategicBI = data.strategicBI || strategicBI;
    }
    $: role = roleCategory || 'employee';
    $: financeSlug = unit?.slug || unit?.login_slug || '';
    $: isFinanceLinkValid = financeSlug && financeSlug !== '#';

    /** @param {string} path */
    const financeLink = (path) => {
        if (!financeSlug) return '#';
        // Remove leading slash from path if present, then construct full path
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `/finance/${financeSlug}/${cleanPath}`;
    };

    /** @param {number} num */
    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    
    // State UI
    let activePreset = 'Hari Ini';
    let selectedKategori = '';
    let modeGrafik = 'arusKas';
    onMount(() => {
    // Auto-redirect cashiers to the POS interface for quick access
    try {
        if (role === 'cashier' && financeSlug) {
            const target = financeLink('pos');
            goto(target);
            return;
        }
    } catch (e) {
        // silent
    }
    browserCookies = document.cookie;
    if (chartCanvas) {
        new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
                datasets: [{
                    label: 'Arus Kas',
                    data: [1200000, 1900000, 1500000, 2500000], // Ganti dengan data asli nanti
                    borderColor: '#4f46e5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.05)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { display: false }, x: { grid: { display: false } } }
            }
        });
    }
});
</script>

<div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 dark:text-slate-300 pb-20" in:fade>
    <div class="max-w-6xl mx-auto px-6 py-6 space-y-6">
        
        <header class="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
                <h1 class="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic leading-none mb-1">
                    {unit?.nama_unit}
                </h1>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-bold">
                    {employee?.position ?? ''} — {employee?.full_name ?? ''} {employee?.job_grade ? `(${employee.job_grade})` : ''} {employee?.division ? `(${employee.division})` : ''}
                </p>
            </div>
            
            <div class="flex items-center gap-3">
                {#if role === 'cashier'}
                    <a href={financeLink('pos')} class="bg-indigo-600 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all">
                        POS KASIR
                    </a>
                {/if}

                <button class="bg-slate-800 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                    + Entri Baru
                </button>
                {#if role === 'operator'}
                    <a href={financeLink('produk')} class="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all">
                        Produk
                    </a>
                {/if}
                {#if role === 'finance'}
                    <a href={financeLink('')} class="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all">
                        Keuangan
                    </a>
                {/if}
                <form method="post" action={`/portal/${unit?.login_slug}/dashboard/logout`} class="m-0">
                    <button type="submit" class="border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100">Logout</button>
                </form>
            </div>
        </header>

        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-[10px] font-bold text-yellow-900">
            <p>Debug cookie browser: <code>{browserCookies}</code></p>
        </div>

        <div class="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm flex flex-wrap gap-4 items-center justify-between px-6">
            <div class="flex gap-2">
                {#each ['Hari Ini', 'Kemarin', '7 Hari', 'Bulan Ini'] as periode}
                    <button on:click={() => (activePreset = periode)}
                        class="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all 
                        {activePreset === periode ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80'}">
                        {periode}
                    </button>
                {/each}
            </div>

            <div class="flex gap-3">
                <select bind:value={selectedKategori} class="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer">
                    <option value="">Semua Kategori</option>
                    <option value="Masuk">Masuk</option>
                    <option value="Keluar">Keluar</option>
                </select>

                {#if ['manager', 'hr', 'owner', 'admin'].includes(role)}
                    <a href={financeLink('hr')} class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">
                        SDM / HR
                    </a>
                {/if}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-slate-800 p-6 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Kas Tersedia</p>
                <p class="text-2xl text-slate-800 dark:text-slate-100 font-light tracking-tighter tabular-nums italic">{formatIDR(data.saldoSaatIni || 0)}</p>
            </div>

            {#if role !== 'operator'}
                <div class="bg-white dark:bg-slate-800 p-6 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm" in:fade>
                    <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 text-emerald-500">Total Pemasukan</p>
                    <p class="text-2xl text-emerald-600 font-light tracking-tighter tabular-nums italic">{formatIDR(data.totalMasuk || 0)}</p>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm" in:fade>
                    <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Laba / Rugi</p>
                    <p class="text-2xl font-light tracking-tighter tabular-nums italic {data.selisih >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-500'}">
                        {formatIDR(data.selisih || 0)}
                    </p>
                </div>
            {/if}
        </div>

        <!-- role-specific panels (all divisions) -->
        {#if role === 'cashier'}
            <div class="mt-4">
                <RoleCashier {financeLink} unit={unit} />
            </div>
        {:else if role === 'operator'}
            <div class="mt-4">
                <RoleOperator {financeLink} unit={unit} />
            </div>
        {:else if role === 'finance'}
            <div class="mt-4">
                <RoleFinance {financeLink} unit={unit} />
            </div>
        {:else if role === 'hr'}
            <div class="mt-4">
                <RoleHR {financeLink} unit={unit} />
            </div>
        {:else if role === 'manager'}
            <div class="mt-4">
                <RoleManager {financeLink} unit={unit} />
            </div>
        {:else if role === 'warehouse'}
            <div class="mt-4">
                <RoleWarehouse {financeLink} unit={unit} />
            </div>
        {:else if role === 'service'}
            <div class="mt-4">
                <RoleService {financeLink} unit={unit} />
            </div>
        {:else if role === 'admin'}
            <div class="mt-4">
                <RoleAdmin {financeLink} unit={unit} />
            </div>
        {:else if role === 'marketing'}
            <div class="mt-4">
                <RoleMarketing {financeLink} unit={unit} />
            </div>
        {:else if role === 'owner'}
            <div class="mt-4">
                <RoleManager {financeLink} unit={unit} />
            </div>
        {:else if role === 'technical'}
            <div class="mt-4">
                <RoleTechnical {financeLink} unit={unit} />
            </div>
        {:else if role === 'logistics'}
            <div class="mt-4">
                <RoleLogistics {financeLink} unit={unit} />
            </div>
        {:else}
            <div class="mt-4">
                <RoleFinance {financeLink} unit={unit} />
            </div>
        {/if}

        {#if role !== 'operator'}
                <div class="bg-white dark:bg-slate-800 p-8 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm" in:fade>
                <div class="flex justify-between items-center mb-8">
                    <p class="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">
                        {modeGrafik === 'arusKas' ? 'Analisis Arus Keuangan' : 'Tren Penjualan Produk'}
                    </p>
                    <div class="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-md">
                        <button on:click={() => modeGrafik = "arusKas"} class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all {modeGrafik === 'arusKas' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 dark:text-slate-500'}">Arus Kas</button>
                        <button on:click={() => modeGrafik = "produkTerlaris"} class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all {modeGrafik === 'produkTerlaris' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 dark:text-slate-500'}">Produk</button>
                    </div>
                </div>
                <div class="h-52 w-full"><canvas bind:this={chartCanvas}></canvas></div>
            </div>
        {/if}

        {#if ['manager', 'owner', 'admin'].includes(role)}
            <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm overflow-hidden mt-6" in:fade>
                <div class="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30 px-8">
                    <h3 class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">Strategic BI Analysis</h3>
                    <div class="flex gap-2 text-[10px] font-black">
                        <span class="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 italic uppercase">AI Confidence: {strategicBI?.aiConfidence}%</span>
                        <span class="bg-slate-800 text-white px-3 py-1 rounded-lg tracking-widest uppercase">{strategicBI?.outlook}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div class="p-8 space-y-4">
                        <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Profitability Index</span>
                        <div class="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500" style="width: {strategicBI?.margin}%"></div>
                        </div>
                        <p class="text-xl font-black italic">{strategicBI?.margin}% <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 not-italic">MARGIN</span></p>
                    </div>
                    <div class="p-8 md:col-span-2 bg-slate-50/20">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            <span class="text-[9px] font-black text-indigo-600 uppercase">Rekomendasi Langsung</span>
                        </div>
                        <p class="text-[11px] text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">"{strategicBI?.suggestion}"</p>
                    </div>
                    <div class="p-8">
                        <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Integrity Score</span>
                        <p class="text-4xl font-black italic tracking-tighter text-slate-800 dark:text-slate-100">{strategicBI?.integrityScore}<span class="text-sm text-emerald-500">/10</span></p>
                    </div>
                </div>
            </div>
        {/if}

        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center px-8">
                <h3 class="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Riwayat Transaksi Terakhir</h3>
                <a href={financeLink('history')} class="text-[10px] font-black text-indigo-600 hover:underline italic">LIHAT SEMUA →</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <tbody class="divide-y divide-slate-50">
                        {#each transactions as trx (trx.id)}
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition-colors group text-[11px]">
                                <td class="px-8 py-4 uppercase font-bold text-slate-700 dark:text-slate-200">
                                    {trx.keterangan}
                                    <span class="block text-[9px] text-slate-400 dark:text-slate-500 font-medium italic">{trx.kategori_trx} — {new Date(trx.tanggal).toLocaleDateString('id-ID')}</span>
                                </td>
                                <td class="px-8 py-4 text-right font-black italic text-sm">
                                    <span class={trx.kategori_trx === 'Masuk' ? 'text-emerald-500' : 'text-rose-500'}>
                                        {trx.kategori_trx === 'Masuk' ? '+' : '-'} {formatIDR(trx.nominal)}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>