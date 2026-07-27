<script>
    import { fade } from 'svelte/transition';
    export let financeLink;
    export let unit = {};

    let serviceLinks = [];
    let isLinksValid = false;

    $: {
        serviceLinks = [
            { label: 'Layanan Portal', href: `/portal/${unit?.login_slug}/service`, icon: '🤝', primary: true },
            { label: 'Produk & Layanan', href: financeLink('produk'), icon: '🛍️' },
            { label: 'Riwayat Transaksi', href: financeLink('history'), icon: '📋' },
            { label: 'Customer Data', href: financeLink('crm'), icon: '👥' },
            { label: 'Support', href: financeLink('cs'), icon: '💬' }
        ];
        isLinksValid = unit?.slug || unit?.login_slug;
    }
</script>

<div class="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" in:fade>
    <div class="flex items-center gap-2 mb-4">
        <div class="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <span class="text-lg">🤝</span>
        </div>
        <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Layanan Pelanggan</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Customer Service & Support</p>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each serviceLinks as link}
            {#if isLinksValid}
                <a href={link.href} class="flex items-center gap-3 p-3 rounded-lg border {link.primary ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' : 'border-slate-200 dark:border-slate-700'} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                    <span class="text-xl">{link.icon}</span>
                    <span class="text-[11px] font-semibold {link.primary ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400'}">{link.label}</span>
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
