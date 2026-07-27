<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data;
    const { unit, productList } = data;
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);
</script>

<PageLayout title="Katalog Produk" subtitle="Atur produk yang tampil di toko online" badge="Ecommerce" slug={unit.slug} {unit}>
    <div slot="actions">
        <a href={`/finance/${unit.slug}/produk/add`}
            class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            + Tambah Produk
        </a>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4" in:fade>
        {#each productList as p}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden group">
            <!-- Foto -->
            <div class="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                {#if p.foto}
                    <img src={p.foto} alt={p.nama} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {:else}
                    <div class="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                {/if}
                <!-- Status badge overlay -->
                <div class="absolute top-2 right-2">
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase
                        {p.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}">
                        {p.status === 'active' ? 'Live' : 'Draft'}
                    </span>
                </div>
            </div>

            <div class="p-3">
                <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mb-0.5">{p.nama}</p>
                <p class="text-xs font-black text-orange-600 dark:text-orange-400">{fmt(p.hargaJual)}</p>
                <p class="text-[9px] text-slate-400 mt-0.5">Stok: {p.stok}</p>

                <div class="flex gap-1.5 mt-3">
                    <form method="POST" action="?/togglePublish" use:enhance class="flex-1">
                        <input type="hidden" name="product_id" value={p.id} />
                        <button type="submit"
                            class="w-full text-[9px] font-black px-2 py-1.5 rounded-lg transition uppercase
                            {p.status === 'active' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
                            {p.status === 'active' ? 'Nonaktif' : 'Aktifkan'}
                        </button>
                    </form>
                    <a href={`/finance/${unit.slug}/produk/${p.slug}/update`}
                        class="text-[9px] font-black px-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 rounded-lg transition uppercase border border-slate-200 dark:border-slate-700">
                        Edit
                    </a>
                </div>
            </div>
        </div>
        {:else}
        <div class="col-span-full py-16 text-center">
            <p class="text-slate-400 font-bold uppercase text-[10px]">Belum ada produk. <a href={`/finance/${unit.slug}/produk/add`} class="text-orange-600 hover:underline">Tambah produk</a></p>
        </div>
        {/each}
    </div>
</PageLayout>
