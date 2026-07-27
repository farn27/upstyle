<script>
    import { fade } from 'svelte/transition';
    export let financeLink;
    export let unit = {};

    let salesLinks = [];
    let isLinksValid = false;

    $: {
        salesLinks = [
            { label: 'Sales Portal', href: `/portal/${unit?.login_slug}/sales`, icon: '💼', primary: true },
            { label: 'E-commerce', href: financeLink('ecommerce'), icon: '🛒' },
            { label: 'Pipeline', href: financeLink('sales'), icon: '📊' },
            { label: 'Leads', href: financeLink('marketing'), icon: '👥' },
            { label: 'Target', href: financeLink(''), icon: '🎯' }
        ];
        isLinksValid = unit?.slug || unit?.login_slug;
    }
</script>

<div class="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" in:fade>
    <div class="flex items-center gap-2 mb-4">
        <div class="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span class="text-lg">💼</span>
        </div>
        <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Sales</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Penjualan & Business Development</p>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each salesLinks as link}
            {#if isLinksValid}
                <a href={link.href} class="flex items-center gap-3 p-3 rounded-lg border {link.primary ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-700'} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                    <span class="text-xl">{link.icon}</span>
                    <span class="text-[11px] font-semibold {link.primary ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}">{link.label}</span>
                </a>
            {:else}
                <div class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-50">
                    <span class="text-xl">{link.icon}</span>
                    <span class="text-[11px] font-semibold text-slate-400">{link.label}</span>
                </div>
            {/if}
        {/each}
    </div>
</div>
