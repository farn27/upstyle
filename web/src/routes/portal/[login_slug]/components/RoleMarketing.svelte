<script>
    import { fade } from 'svelte/transition';
    export let financeLink;
    export let unit = {};

    let marketingLinks = [];
    let isLinksValid = false;

    $: {
        marketingLinks = [
            { label: 'Marketing Portal', href: `/portal/${unit?.login_slug}/marketing`, icon: '📢', primary: true },
            { label: 'E-commerce', href: financeLink('ecommerce'), icon: '🛒' },
            { label: 'Marketing', href: financeLink('marketing'), icon: '📢' },
            { label: 'Sales', href: financeLink('sales'), icon: '💼' },
            { label: 'Campaign', href: financeLink('marketing'), icon: '🎯' },
            { label: 'Leads', href: financeLink('marketing'), icon: '👥' }
        ];
        isLinksValid = unit?.slug || unit?.login_slug;
    }
</script>

<div class="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" in:fade>
    <div class="flex items-center gap-2 mb-4">
        <div class="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
            <span class="text-lg">📢</span>
        </div>
        <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Marketing & Sales</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Pemasaran & Penjualan</p>
        </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        {#each marketingLinks as link}
            {#if isLinksValid}
                <a href={link.href} class="flex flex-col items-center gap-2 p-4 rounded-lg border {link.primary ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' : 'border-slate-200 dark:border-slate-700'} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                    <span class="text-2xl">{link.icon}</span>
                    <span class="text-[10px] font-semibold {link.primary ? 'text-pink-700 dark:text-pink-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-pink-600 dark:group-hover:text-pink-400'} text-center">{link.label}</span>
                </a>
            {:else}
                <div class="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-50">
                    <span class="text-2xl">{link.icon}</span>
                    <span class="text-[10px] font-semibold text-slate-400 text-center">{link.label}</span>
                </div>
            {/if}
        {/each}
    </div>
</div>
