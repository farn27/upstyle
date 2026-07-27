<script>
    import { fade } from 'svelte/transition';
    export let data;

    let unit = {};

    $: if (data) {
        unit = data.unit || {};
    }

    const financeLink = (path) => {
        if (!unit?.slug) return '#';
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `/finance/${unit.slug}/${cleanPath}`;
    };
</script>

<div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 dark:text-slate-300 pb-20" in:fade>
    <div class="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <header class="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
                <h1 class="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic leading-none mb-1">
                    Teknis Portal
                </h1>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-bold">
                    {unit?.nama_unit}
                </p>
            </div>
            <div class="flex items-center gap-3">
                <a href={financeLink('produk')} class="bg-cyan-600 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-100 hover:scale-105 transition-all">
                    Produk
                </a>
                <a href={financeLink('settings')} class="bg-slate-800 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-100 hover:scale-105 transition-all">
                    Settings
                </a>
                <a href={`/portal/${unit?.login_slug}/dashboard`} class="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                    Back to Dashboard
                </a>
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href={financeLink('produk')} class="bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                <div class="flex items-center gap-3 mb-3">
                    <span class="text-2xl">📦</span>
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Produk</h3>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400">Cek ketersediaan</p>
            </a>
            <a href={financeLink('settings')} class="bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                <div class="flex items-center gap-3 mb-3">
                    <span class="text-2xl">🔧</span>
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Maintenance</h3>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400">Jadwal maintenance</p>
            </a>
            <a href={financeLink('settings')} class="bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                <div class="flex items-center gap-3 mb-3">
                    <span class="text-2xl">✅</span>
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Quality Control</h3>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400">Cek kualitas</p>
            </a>
        </div>

        <div class="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Actions</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <a href={financeLink('produk')} class="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-center">
                    <span class="text-2xl block mb-2">🔍</span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Cek Stok</span>
                </a>
                <a href={financeLink('produk')} class="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-center">
                    <span class="text-2xl block mb-2">🔄</span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Update Status</span>
                </a>
                <a href={financeLink('settings')} class="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-center">
                    <span class="text-2xl block mb-2">📝</span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Log Maintenance</span>
                </a>
                <a href={financeLink('settings')} class="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-center">
                    <span class="text-2xl block mb-2">💻</span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Support IT</span>
                </a>
            </div>
        </div>
    </div>
</div>
