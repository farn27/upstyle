<script>
    import { page } from '$app/stores';
    import { fade } from 'svelte/transition';
    export let data;
    
    $: currentPath = $page.url.pathname;
    
    const menuItems = [
        { label: 'Dashboard', path: `/finance/${data.slug}/pos/kelola`, icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { label: 'Produk POS', path: `/finance/${data.slug}/pos/kelola/produk`, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { label: 'Promo & Diskon', path: `/finance/${data.slug}/pos/kelola/promo`, icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
        { label: 'Konfigurasi Fitur', path: `/finance/${data.slug}/pos/kelola/fitur`, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    ];
</script>

<div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex shrink-0 border-r border-slate-800">
        <div class="p-6">
            <h2 class="text-xl font-black text-white uppercase tracking-tight">Kelola POS</h2>
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Control Panel</p>
        </div>
        
        <nav class="flex-1 px-4 space-y-2 mt-4">
            {#each menuItems as item}
                <a href={item.path} class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm {currentPath === item.path ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/>
                    </svg>
                    {item.label}
                </a>
            {/each}
        </nav>
        
        <div class="p-6 border-t border-slate-800">
            <a href={`/finance/${data.slug}/pos`} class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all mt-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Kembali ke POS
            </a>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 min-w-0 overflow-auto">
        <div in:fade={{duration: 200}}>
            <slot />
        </div>
    </main>
</div>
