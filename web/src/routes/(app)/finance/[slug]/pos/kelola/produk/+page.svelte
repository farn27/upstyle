<script>
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';
    export let data;
    
    let products = data.products || [];
    let searchTerm = "";
    
    $: filteredProducts = products.filter(p => 
        p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
</script>

<div class="p-6 md:p-8 h-full flex flex-col">
    <header class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Kelola Produk POS</h1>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Pilih produk yang tampil di aplikasi kasir</p>
        </div>
        <div class="relative w-full md:w-72">
            <input type="text" bind:value={searchTerm} placeholder="Cari nama / SKU..." class="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/>
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
    </header>

    <div class="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div class="overflow-auto flex-1 custom-scrollbar">
            <table class="w-full text-left">
                <thead class="bg-slate-50 sticky top-0 z-10">
                    <tr>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Info Produk</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">SKU</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Harga</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Stok</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Tampil di POS</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    {#each filteredProducts as p}
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="py-4 px-6">
                                <p class="text-sm font-bold text-slate-900">{p.nama}</p>
                            </td>
                            <td class="py-4 px-6">
                                <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{p.sku || '-'}</span>
                            </td>
                            <td class="py-4 px-6">
                                <p class="text-sm font-bold text-emerald-600">Rp {Number(p.hargaJual).toLocaleString('id-ID')}</p>
                            </td>
                            <td class="py-4 px-6">
                                <span class="text-xs font-bold {p.stok > 0 ? 'text-blue-600' : 'text-rose-600'}">{p.stok}</span>
                            </td>
                            <td class="py-4 px-6 text-center">
                                <form method="POST" action="?/toggle" use:enhance={() => {
                                    return async ({ update }) => {
                                        p.showInPos = p.showInPos ? 0 : 1;
                                        await update({ reset: false });
                                    };
                                }}>
                                    <input type="hidden" name="productId" value={p.id} />
                                    <input type="hidden" name="showInPos" value={!p.showInPos} />
                                    <button type="submit" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {p.showInPos ? 'bg-blue-600' : 'bg-slate-200'}">
                                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {p.showInPos ? 'translate-x-6' : 'translate-x-1'} shadow-sm"></span>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">Tidak ada produk ditemukan</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
</style>
