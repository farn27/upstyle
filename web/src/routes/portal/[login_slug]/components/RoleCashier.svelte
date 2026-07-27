<script>
    /** @type {(path: string) => string} */
    export let financeLink = (/** @type {string} */ p) => '#';
    export let unit = {};

    $: posLink = financeLink('pos');
    $: isPosLinkValid = posLink && posLink !== '#';
</script>

<div class="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
    <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">POS Kasir</h3>
    <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Akses cepat ke antarmuka kasir untuk mencatat transaksi penjualan.</p>
    <div class="mt-4">
        {#if isPosLinkValid}
            <a href={posLink} class="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-all">Buka POS</a>
        {:else}
            <button disabled class="inline-block bg-slate-300 text-slate-500 px-4 py-2 rounded-md cursor-not-allowed">Link tidak tersedia</button>
        {/if}
    </div>
</div>
