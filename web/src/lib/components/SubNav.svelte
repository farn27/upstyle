<script>
    import { page } from '$app/stores';
    import { slide } from 'svelte/transition';
    import { 
        LayoutDashboard, 
        Package, 
        ShoppingCart, 
        Users, 
        Handshake, 
        Database, 
        BookOpen, 
        Book, 
        ArrowUpRight, 
        ArrowDownLeft, 
        FileBarChart, 
        Settings 
    } from 'lucide-svelte';

    export let slug = '';

    const normalizeSlug = (value) => {
        if (typeof value !== 'string') return '';
        const cleaned = value.trim();
        return cleaned && cleaned !== 'undefined' && cleaned !== 'null' ? cleaned : '';
    };

    $: activeSlug = normalizeSlug(slug) || normalizeSlug($page.params.slug);
    $: menuItems = [
        { name: 'Dashboard', suffix: '', icon: LayoutDashboard },
        { name: 'Produk', suffix: '/produk', icon: Package },
        { name: 'POS', suffix: '/pos', icon: ShoppingCart },
        { name: 'SDM / HR', suffix: '/hr', icon: Users },
        { name: 'CRM', suffix: '/crm', icon: Handshake },
        { id: 'master-data', name: 'Master Data', suffix: '/master-data', icon: Database },
        { id: 'jurnal-umum', name: 'Jurnal Umum', suffix: '/jurnal-umum', icon: BookOpen },
        { id: 'buku-besar', name: 'Buku Besar', suffix: '/buku-besar', icon: Book },
        { id: 'piutang', name: 'Piutang (AR)', suffix: '/piutang', icon: ArrowUpRight },
        { id: 'hutang', name: 'Hutang (AP)', suffix: '/hutang', icon: ArrowDownLeft },
        { id: 'laporan', name: 'Laporan', suffix: '/laporan', icon: FileBarChart },
        { id: 'settings', name: 'Pengaturan', suffix: '/settings', icon: Settings }
    ].map((menu) => ({
        ...menu,
        path: activeSlug ? `/finance/${activeSlug}${menu.suffix}` : '#'
    }));

    // Helper to check if menu path is active
    $: isActive = (menu) => {
        return $page.url.pathname === menu.path || $page.url.pathname.startsWith(menu.path + '/');
    };
</script>

<div class="flex items-center gap-1.5 w-full overflow-x-auto scrollbar-thin py-1 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
    {#each menuItems as menu}
        {@const active = isActive(menu)}
        
        <a
            href={menu.path}
            class="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0
                {active 
                    ? 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/50' 
                    : 'text-slate-600 dark:text-slate-400 border border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}"
        >
            <svelte:component this={menu.icon} class="w-4 h-4 shrink-0" />
            <span>{menu.name}</span>
        </a>
    {/each}
</div>

<style>
    /* Thin, elegant, minimalist scrollbar specifically for desktop mouse users to navigate long tab lists */
    .scrollbar-thin::-webkit-scrollbar {
        height: 6px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 6px;
    }
    :global(.dark) .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #475569;
    }
</style>