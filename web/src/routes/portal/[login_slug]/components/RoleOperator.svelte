<script>
    /** @type {(path: string) => string} */
    export let financeLink = (/** @type {string} */ p) => '#';
    export let unit = {};

    $: produkLink = financeLink('produk');
    $: stockLogsLink = financeLink('produk/stock_logs');
    $: isLinksValid = produkLink && produkLink !== '#';
</script>

<div class="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
    <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">Operator Gudang</h3>
    <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Akses produk dan stok. Tidak ada akses ke laporan keuangan atau pengaturan HR.</p>
    <div class="mt-4 grid grid-cols-1 gap-3">
        {#if isLinksValid}
            <a href={produkLink} class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">Lihat Produk</a>
            <a href={stockLogsLink} class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">Riwayat Stok</a>
        {:else}
            <button disabled class="inline-block border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md cursor-not-allowed text-slate-400">Link tidak tersedia</button>
        {/if}
    </div>
</div>
