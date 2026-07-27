<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    export let data;
    $: slug = $page.params.slug;
    /** @type {Array<any>} */
    $: deletedProducts = data.products || [];
    $: unitInfo = data.unitInfo;

    /** @param {string} id */
    function restore(id) {
        fetch(`/finance/${slug}/produk`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'restore', ids: [id] })
        }).then(async res => {
            if (res.ok) goto(`/finance/${slug}/produk`, { invalidateAll: true });
            else alert((await res.json()).error || 'Gagal restore produk');
        });
    }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-sans">
    <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between gap-4 mb-6">
            <div>
                <p class="text-xs uppercase text-slate-400 dark:text-slate-500">Sampah Produk</p>
                <h1 class="text-xl font-black text-slate-900 dark:text-white">Produk Terhapus</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Restore produk yang terhapus secara tidak sengaja atau kosongkan Sampah.</p>
            </div>
            <button on:click={() => goto(`/finance/${slug}/produk`)} class="px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 transition">Kembali ke Katalog</button>
        </div>

        {#if deletedProducts.length === 0}
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-400 dark:text-slate-500">
                Tidak ada produk di Sampah.
            </div>
        {:else}
            <div class="space-y-3">
                {#each deletedProducts as p}
                    <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <p class="font-black text-slate-900 dark:text-white">{p.nama}</p>
                            <p class="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">{p.kategoriProduk?.namaKategori || 'Tanpa Kategori'}</p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">SKU: {p.sku || 'N/A'} • Status: {p.status || 'archived'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button on:click={() => restore(p.id)} class="px-3 py-2 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition">Restore</button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
