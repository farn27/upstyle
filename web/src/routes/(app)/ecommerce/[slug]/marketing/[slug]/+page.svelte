<script>
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';

    export let data;
    const { unit, stats, recentCampaigns } = data;

    function formatRupiah(val) {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(val) || 0);
    }

    function getStatusColor(status) {
        switch(status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
            case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
            case 'COMPLETED': return 'bg-slate-100 text-slate-600';
            default: return 'bg-amber-100 text-amber-700';
        }
    }
</script>

<PageLayout title="Marketing Dashboard" subtitle="Ringkasan performa pemasaran dan kampanye" badge={unit?.tipe || 'General'} slug={unit.slug} unit={unit}>

    <!-- METRICS GRID -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6" in:fade={{ duration: 150 }}>
        <!-- Card 1: Total Leads -->
        <div class="bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-xl p-5 shadow-md text-white relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-white/70">Total Leads</p>
                    <h3 class="text-3xl font-black mt-1">{stats.totalLeads.toLocaleString('id-ID')}</h3>
                </div>
                <div class="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-white/10 relative z-10">
                <a href={`/ecommerce/${unit.slug}/marketing/leads`} class="text-[9px] font-bold uppercase tracking-wider text-white hover:text-white/80 flex items-center gap-1 transition">
                    Lihat Prospek Masuk <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>

        <!-- Card 2: Ad Spend -->
        <div class="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Ad Spend</p>
                    <h3 class="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">{formatRupiah(stats.totalAdSpend)}</h3>
                </div>
                <div class="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <a href={`/ecommerce/${unit.slug}/marketing/campaign`} class="text-[9px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition">
                    Catat Pengeluaran Iklan <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>

        <!-- Card 3: Campaigns -->
        <div class="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Kampanye Promo</p>
                    <h3 class="text-2xl font-black mt-1 text-slate-800 dark:text-white">{stats.totalCampaigns.toLocaleString('id-ID')}</h3>
                </div>
                <div class="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <a href={`/ecommerce/${unit.slug}/marketing/campaign`} class="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 flex items-center gap-1 transition">
                    Kelola Kampanye <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>

        <!-- Card 4: Vouchers -->
        <div class="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Voucher Aktif</p>
                    <h3 class="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{stats.totalVouchers.toLocaleString('id-ID')}</h3>
                </div>
                <div class="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <a href={`/ecommerce/${unit.slug}/marketing/voucher`} class="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 flex items-center gap-1 transition">
                    Kelola Voucher <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>
    </div>

    <!-- RECENT CAMPAIGNS -->
    <div class="mt-8 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" in:fade={{ duration: 150 }}>
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Kampanye Terbaru</h2>
            <a href={`/ecommerce/${unit.slug}/marketing/campaign`} class="text-[10px] font-bold uppercase text-fuchsia-600 hover:underline">Lihat Semua</a>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50/50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                    <tr>
                        <th class="px-5 py-3">Nama Kampanye</th>
                        <th class="px-5 py-3 text-center">Tipe</th>
                        <th class="px-5 py-3 text-right">Budget</th>
                        <th class="px-5 py-3 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                    {#each recentCampaigns as camp}
                        <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td class="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{camp.name}</td>
                            <td class="px-5 py-3 text-center">
                                <span class="px-2 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{camp.type}</span>
                            </td>
                            <td class="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-300">{formatRupiah(camp.budget)}</td>
                            <td class="px-5 py-3 text-center">
                                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider {getStatusColor(camp.status)}">
                                    {camp.status}
                                </span>
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td colspan="4" class="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-wider">Belum ada data kampanye.</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</PageLayout>
