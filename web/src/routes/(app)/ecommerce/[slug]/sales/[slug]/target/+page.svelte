<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit, targets, month, year } = data;
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);
    const MONTHS = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    let newUserId = '';
    let newAmount = 0;
    let newKomisi = 0;
</script>

<PageLayout title="Target & Komisi" subtitle="Kelola target penjualan dan komisi tim" badge="Sales" slug={unit.slug} {unit}>

    <!-- Set Target Form -->
    <div class="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm" in:fade>
        <h3 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">
            Set Target — {MONTHS[month]} {year}
        </h3>
        <form method="POST" action="?/setTarget" use:enhance class="flex flex-wrap gap-3 items-end">
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">User ID Sales</label>
                <input type="number" name="user_id" bind:value={newUserId} required placeholder="ID User"
                    class="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
            </div>
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target (Rp)</label>
                <input type="number" name="target_amount" bind:value={newAmount} min="0" placeholder="0"
                    class="w-40 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
            </div>
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Komisi (%)</label>
                <input type="number" name="komisi_persen" bind:value={newKomisi} min="0" max="100" step="0.5" placeholder="0"
                    class="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
            </div>
            <button type="submit"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
                Simpan Target
            </button>
            {#if form?.success}<span class="text-[10px] text-emerald-600 font-bold">✓ Tersimpan</span>{/if}
        </form>
    </div>

    <!-- Leaderboard Table -->
    <div class="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
        <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <p class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Pencapaian Tim — {MONTHS[month]} {year}</p>
        </div>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                    <th class="px-5 py-3">#</th><th class="px-5 py-3">Sales</th>
                    <th class="px-5 py-3 text-right">Target</th><th class="px-5 py-3 text-right">Closing</th>
                    <th class="px-5 py-3 text-center">Progress</th>
                    <th class="px-5 py-3 text-right">Komisi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each targets as t, i}
                <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td class="px-5 py-3 font-black text-slate-400">{i+1}</td>
                    <td class="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{t.user?.username || `User #${t.userId}`}</td>
                    <td class="px-5 py-3 text-right text-slate-600 dark:text-slate-400">{fmt(t.targetAmount)}</td>
                    <td class="px-5 py-3 text-right font-black {t.closing >= Number(t.targetAmount) ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}">{fmt(t.closing)}</td>
                    <td class="px-5 py-3 text-center min-w-[140px]">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500
                                    {t.progress >= 100 ? 'bg-emerald-500' : t.progress >= 50 ? 'bg-indigo-500' : 'bg-amber-400'}"
                                    style="width:{t.progress}%"></div>
                            </div>
                            <span class="text-[10px] font-black w-10 text-right
                                {t.progress >= 100 ? 'text-emerald-600' : 'text-slate-500'}">{t.progress.toFixed(0)}%</span>
                        </div>
                    </td>
                    <td class="px-5 py-3 text-right font-black text-indigo-600">{fmt(t.komisi)}</td>
                </tr>
                {:else}
                <tr><td colspan="6" class="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada target yang diset</td></tr>
                {/each}
            </tbody>
        </table>
    </div>
</PageLayout>
