<script>
    import { page } from '$app/stores';
    import { 
        LayoutDashboard, 
        Megaphone, 
        Globe, 
        Ticket 
    } from 'lucide-svelte';

    export let slug = '';

    const normalizeSlug = (value) => {
        if (typeof value !== 'string') return '';
        const cleaned = value.trim();
        return cleaned && cleaned !== 'undefined' && cleaned !== 'null' ? cleaned : '';
    };

    $: activeSlug = normalizeSlug(slug) || normalizeSlug($page.params.slug);
    $: menuItems = [
        { name: 'Dashboard Pemasaran', suffix: '', icon: LayoutDashboard },
        { name: 'Kampanye & Iklan', suffix: '/campaign', icon: Megaphone },
        { name: 'Landing Page & Leads', suffix: '/leads', icon: Globe },
        { name: 'Voucher & Diskon', suffix: '/voucher', icon: Ticket }
    ].map((menu) => ({
        ...menu,
        path: activeSlug ? `/marketing/${activeSlug}${menu.suffix}` : '#'
    }));
</script>

<div class="flex flex-wrap items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-2">
    {#each menuItems as menu}
        {@const isActive = $page.url.pathname === menu.path || ($page.url.pathname.startsWith(menu.path + '/') && menu.suffix !== '')}
        
        <a
            href={menu.path}
            class="flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all
                {isActive 
                    ? 'text-fuchsia-600 dark:text-fuchsia-400 border-b-2 border-fuchsia-600 dark:border-fuchsia-400 bg-transparent rounded-none' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b-2 border-transparent rounded-none'}"
        >
            <svelte:component this={menu.icon} class="w-3.5 h-3.5" />
            
            <span>{menu.name}</span>
        </a>
    {/each}
</div>
