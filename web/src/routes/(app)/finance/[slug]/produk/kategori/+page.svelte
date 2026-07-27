<script>
    import { enhance } from '$app/forms';
    import { toastPesan } from '$lib/notifStore';
    import { page } from '$app/stores';

    export let data;
    export let form;

    $: categories = data.categories || [];
    $: slug = $page.params.slug;
    $: unitInfo = data.unitInfo;

    let loading = false;

    // React to form actions
    $: if (form?.success) {
        toastPesan.set(`✅ ${form.message}`);
        setTimeout(() => toastPesan.set(''), 3000);
        loading = false;
    } else if (form?.message) {
        alert(form.message);
        loading = false;
    }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pb-10">
    <!-- Header -->
    <div class="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
        <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <a href={`/finance/${slug}/produk`} aria-label="Kembali ke Produk" class="p-2 -ml-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                </a>
                <div>
                    <h1 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Master Kategori</h1>
                    <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Katalog Produk</p>
                </div>
            </div>
        </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Sidebar Add Form -->
            <div class="md:col-span-1">
                <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-24">
                    <h2 class="text-xs font-black uppercase text-slate-900 dark:text-white mb-4">Tambah Kategori</h2>
                    
                    <form method="POST" action="?/add" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; } }}>
                        <div class="space-y-4">
                            <div>
                                <label for="kategori-nama" class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Nama Kategori</label>
                                <input id="kategori-nama" type="text" name="nama" required placeholder="Cth: MINUMAN DINGIN" class="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none uppercase font-semibold" />
                            </div>
                            <button type="submit" disabled={loading} class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                                {#if loading}
                                    <span class="animate-spin text-sm">↻</span>
                                {:else}
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                    Simpan Baru
                                {/if}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- List Categories -->
            <div class="md:col-span-2">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <span class="text-xs font-black uppercase text-slate-900 dark:text-white">Daftar Kategori Aktif</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">{categories.length} Total</span>
                    </div>
                    
                    {#if categories.length === 0}
                        <div class="p-10 text-center">
                            <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                            <p class="text-xs font-bold text-slate-400 uppercase">Belum ada Kategori</p>
                        </div>
                    {:else}
                        <ul class="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto no-scrollbar">
                            {#each categories as cat}
                                <li class="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition flex items-center justify-between group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                                            {cat.namaKategori.charAt(0)}
                                        </div>
                                        <span class="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase">{cat.namaKategori}</span>
                                    </div>
                                    <form method="POST" action="?/delete" use:enhance on:submit={(e) => { if(!confirm(`Hapus kategori ${cat.namaKategori}?`)) e.preventDefault(); }}>
                                        <input type="hidden" name="id" value={cat.id} />
                                        <button type="submit" aria-label="Hapus Kategori" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition rounded hover:bg-rose-50 dark:hover:bg-rose-900/30">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                    </form>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>
