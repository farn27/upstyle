<script>
    import { fade } from 'svelte/transition';
    export let financeLink;
    export let unit = {};

    let adminLinks = [];
    let isLinksValid = false;

    $: {
        adminLinks = [
            { label: 'Dashboard', href: financeLink(''), icon: '📊' },
            { label: 'HR & SDM', href: financeLink('hr'), icon: '👥' },
            { label: 'Keuangan', href: financeLink(''), icon: '💰' },
            { label: 'Produk', href: financeLink('produk'), icon: '📦' },
            { label: 'Settings', href: financeLink('settings'), icon: '⚙️' },
            { label: 'Users', href: financeLink('hr'), icon: '👤' }
        ];
        isLinksValid = unit?.slug || unit?.login_slug;
    }
</script>

<div class="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" in:fade>
    <div class="flex items-center gap-2 mb-4">
        <div class="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <span class="text-lg">🔧</span>
        </div>
        <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Akses Sistem Penuh</p>
        </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        {#each adminLinks as link}
            {#if isLinksValid}
                <a href={link.href} class="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                    <span class="text-2xl">{link.icon}</span>
                    <span class="text-[10px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 text-center">{link.label}</span>
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
