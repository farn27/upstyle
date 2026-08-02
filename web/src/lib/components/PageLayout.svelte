<script>
    import PageBanner from '$lib/components/PageBanner.svelte';
    import SubNav from '$lib/components/SubNav.svelte';
    import { page } from '$app/stores';
    
    export let title = "";
    export let subtitle = "";
    export let badge = "";
    export let slug = "";
    export let unit = null;
    export let hideSubNav = false;

    // Deteksi sistem berdasarkan path
    $: system = (() => {
        const p = $page.url.pathname;
        if (p.includes('/ecommerce/') && p.includes('/sales')) return 'sales';
        if (p.includes('/ecommerce/') && p.includes('/marketing')) return 'marketing';
        if (p.includes('/ecommerce/') && p.includes('/layanan')) return 'customer-service';
        if (p.startsWith('/ecommerce')) return 'ecommerce';
        if (p.startsWith('/finance')) return 'finance';
        return null;
    })();

    // Sub-nav per sistem
    const systemNavs = {
        finance: null, // pakai SubNav komponen existing
        sales: [
            { label: 'Dashboard Sales', path: `/ecommerce/${slug}/sales` },
            { label: 'Pipeline B2B', path: `/ecommerce/${slug}/sales/pipeline` },
            { label: 'Penawaran', path: `/ecommerce/${slug}/sales/quotation` },
            { label: 'Sales Order', path: `/ecommerce/${slug}/sales/order` },
            { label: 'Target & Komisi', path: `/ecommerce/${slug}/sales/target` },
        ],
        marketing: [
            { label: 'Dashboard Marketing', path: `/ecommerce/${slug}/marketing` },
            { label: 'Kampanye', path: `/ecommerce/${slug}/marketing/campaign` },
            { label: 'Leads', path: `/ecommerce/${slug}/marketing/leads` },
            { label: 'Voucher', path: `/ecommerce/${slug}/marketing/voucher` },
        ],
        'customer-service': [
            { label: 'Support Dashboard', path: `/ecommerce/${slug}/layanan` },
            { label: 'Tiket CS', path: `/ecommerce/${slug}/layanan/tickets` },
            { label: 'Knowledge Base', path: `/ecommerce/${slug}/layanan/knowledge-base` },
        ],
        ecommerce: [
            { label: 'Setelan', path: `/ecommerce/${slug}` },
            { label: 'Pesanan', path: `/ecommerce/${slug}/orders` },
            { label: 'Katalog', path: `/ecommerce/${slug}/katalog` },
            { label: 'Integrasi', path: `/ecommerce/${slug}/integrasi` },
            { label: 'Landing Page', path: `/ecommerce/${slug}/landing-page` },
        ],
    };

    $: navItems = system && system !== 'finance' ? (systemNavs[system] ?? []) : [];
    $: currentPath = $page.url.pathname;
</script>

<div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 mb-10 font-sans min-h-screen text-slate-600 dark:text-slate-300 relative bg-slate-50/30 dark:bg-slate-900/30 overflow-x-hidden">
    
    <div class="pt-3"></div>

    <PageBanner 
        title={title || unit?.namaUnit || "Unit Bisnis"} 
        subtitle={subtitle || "Enterprise Command Center"}
        badge={badge || unit?.kategori || "ENTERPRISE"}
    >
        <!-- Standard header actions slot -->
        <slot name="actions" slot="actions"></slot>
    </PageBanner>

    <!-- Sub Nav & Integrated Controls (Sticky at top when scrolling) -->
    {#if !hideSubNav}
        {#if system === 'finance'}
            <div class="sticky top-[64px] z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-5 shadow-sm rounded-xl p-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <!-- Left: SubNav container with min-w-0 to allow proper flex shrinking for child scrolling -->
                <div class="flex-1 min-w-0 w-full overflow-x-auto">
                    <SubNav {slug} />
                </div>
                
                <!-- Right: Period actions slot rendered in the same sticky row -->
                {#if $$slots["nav-actions"]}
                    <div class="shrink-0 flex items-center justify-end w-full md:w-auto">
                        <slot name="nav-actions"></slot>
                    </div>
                {/if}
            </div>
        {:else if navItems.length > 0}
            <div class="sticky top-[64px] z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-5 shadow-sm rounded-xl p-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="flex-1 min-w-0 w-full flex items-center gap-1.5 py-1 overflow-x-auto scrollbar-thin">
                    {#each navItems as item}
                        <a
                            href={item.path}
                            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-wide transition-all whitespace-nowrap shrink-0
                                {currentPath === item.path || currentPath.startsWith(item.path + '/')
                                    ? 'bg-indigo-50 text-indigo-755 dark:bg-indigo-900/40 dark:text-indigo-300'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}"
                        >
                            {item.label}
                        </a>
                    {/each}
                </div>
                {#if $$slots["nav-actions"]}
                    <div class="shrink-0 flex items-center justify-end w-full md:w-auto">
                        <slot name="nav-actions"></slot>
                    </div>
                {/if}
            </div>
        {/if}
    {/if}

    <div class="relative">
        <slot></slot>
    </div>
</div>

<style>
    /* Thin, elegant, minimalist scrollbar specifically for desktop mouse users to navigate long tab lists */
    .scrollbar-thin::-webkit-scrollbar {
        height: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
    }
    :global(.dark) .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #475569;
    }
</style>
