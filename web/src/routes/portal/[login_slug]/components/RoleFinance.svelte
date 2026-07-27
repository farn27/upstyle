<script>
    /** @type {(path: string) => string} */
    export let financeLink = (/** @type {string} */ p) => '#';
    export let unit = {};

    $: financeDashboardLink = financeLink('');
    $: historyLink = financeLink('history');
    $: posLink = financeLink('pos');
    $: isLinksValid = financeDashboardLink && financeDashboardLink !== '#';
</script>

<div class="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
    <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">Finance</h3>
    <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Akses lengkap ke laporan finansial, kas, dan pengaturan transaksi.</p>
    <div class="mt-4 grid grid-cols-1 gap-3">
        {#if isLinksValid}
            <a href={financeDashboardLink} class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">Dashboard Keuangan</a>
            <a href={historyLink} class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">Riwayat Transaksi</a>
            <a href={posLink} class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">POS</a>
        {:else}
            <button disabled class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md cursor-not-allowed text-slate-400">Link tidak tersedia</button>
        {/if}
    </div>
</div>
