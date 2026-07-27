<script>
    import { page } from '$app/stores';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';

    export let data;
    const { unit, stats, leaderboard, recentDeals } = data;

    $: slug = $page.params.slug;

    function formatRupiah(val) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0
        }).format(Number(val) || 0);
    }

    const MONTHS = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    $: targetProgress = stats.targetAmount > 0 
        ? Math.min((stats.closedWonValue / stats.targetAmount) * 100, 100) 
        : 0;
</script>

<PageLayout title="Dashboard Penjualan" subtitle="Ringkasan performa tim sales dan pencapaian target" badge={unit?.tipe || 'General'} slug={slug} unit={unit}>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4" in:fade>
        <!-- Card 1: Pipeline Value -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
                <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Nilai Pipeline</span>
                <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
                    {formatRupiah(stats.pipelineValue)}
                </p>
            </div>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-4">Total nilai dari prospek yang sedang berjalan</p>
        </div>

        <!-- Card 2: Deal Closing -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
                <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Closing Bulan Ini</span>
                <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                    {formatRupiah(stats.closedWonValue)}
                </p>
            </div>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-4">Berhasil dimenangkan: {stats.closedWonCount} Deal</p>
        </div>

        <!-- Card 3: Target Bulanan -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm md:col-span-2 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Target {MONTHS[stats.currentMonth]} {stats.currentYear}</span>
                    <span class="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                        {targetProgress.toFixed(0)}% Tercapai
                    </span>
                </div>
                <div class="flex justify-between items-baseline gap-2">
                    <p class="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                        {formatRupiah(stats.closedWonValue)}
                    </p>
                    <span class="text-[10px] text-slate-400 font-bold">
                        dari target {formatRupiah(stats.targetAmount || 10000000)}
                    </span>
                </div>
            </div>
            <div class="mt-4">
                <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500" style="width: {targetProgress}%"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Leaderboard and Recent Deals Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        <!-- Left: Leaderboard (col-span-2) -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                🏆 Sales Leaderboard
            </h3>
            
            {#if leaderboard.length > 0}
                <div class="space-y-4">
                    {#each leaderboard as member, index}
                        <div class="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-3 last:border-0 last:pb-0">
                            <div class="flex items-center gap-3">
                                <span class="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black 
                                    {index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-700'}">
                                    {index + 1}
                                </span>
                                <div>
                                    <p class="text-xs font-bold text-slate-800 dark:text-white uppercase">
                                        {member.username || 'Sales Staff'}
                                    </p>
                                    <p class="text-[9px] text-slate-400 font-bold">{member.dealCount} deals won</p>
                                </div>
                            </div>
                            <p class="text-xs font-black text-slate-800 dark:text-white">
                                {formatRupiah(member.totalSales)}
                            </p>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="py-12 text-center text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                    Belum ada data closing
                </div>
            {/if}
        </div>

        <!-- Right: Recent Deals (col-span-3) -->
        <div class="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    📈 Deals / Prospek Terbaru
                </h3>
                <a href={`/ecommerce/${slug}/sales/pipeline`} class="text-[9px] font-black text-indigo-600 uppercase hover:underline">Lihat Pipeline</a>
            </div>

            {#if recentDeals.length > 0}
                <div class="overflow-x-auto">
                    <table class="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                                <th class="py-2">Nama Deal</th>
                                <th class="py-2">Kontak</th>
                                <th class="py-2 text-right">Nilai</th>
                                <th class="py-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {#each recentDeals as deal}
                                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td class="py-3 font-bold text-slate-800 dark:text-white uppercase tracking-tight">{deal.namaDeal}</td>
                                    <td class="py-3 text-slate-500">{deal.contact?.nama || 'Tanpa Kontak'}</td>
                                    <td class="py-3 text-right font-black text-slate-800 dark:text-white">{formatRupiah(deal.nilai)}</td>
                                    <td class="py-3 text-center">
                                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase
                                            {deal.status === 'won' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                             deal.status === 'lost' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                             'bg-amber-50 text-amber-600 border border-amber-100'}">
                                            {deal.status}
                                        </span>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else}
                <div class="py-16 text-center text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                    Belum ada deal terdaftar
                </div>
            {/if}
        </div>
    </div>
</PageLayout>
