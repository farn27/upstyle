<script>
    import { fade } from 'svelte/transition';
    export let financeLink;
    export let unit = {};

    let backofficeLinks = [];
    let isLinksValid = false;

    $: {
        backofficeLinks = [
            { label: 'Back Office Portal', href: `/portal/${unit?.login_slug}/backoffice`, icon: '📝', primary: true },
            { label: 'Administrasi', href: financeLink('hr'), icon: '📋' },
            { label: 'Dokumen', href: financeLink('hr'), icon: '📄' },
            { label: 'Laporan', href: financeLink('history'), icon: '📊' },
            { label: 'Arsip', href: financeLink('settings'), icon: '🗂️' }
        ];
        isLinksValid = unit?.slug || unit?.login_slug;
    }
</script>

<div class="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" in:fade>
    <div class="flex items-center gap-2 mb-4">
        <div class="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <span class="text-lg">📝</span>
        </div>
        <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Back Office</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Administrasi & Dokumen</p>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each backofficeLinks as link}
            {#if isLinksValid}
                <a href={link.href} class="flex items-center gap-3 p-3 rounded-lg border {link.primary ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                    <span class="text-xl">{link.icon}</span>
                    <span class="text-[11px] font-semibold {link.primary ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-600 dark:group-hover:text-slate-400'}">{link.label}</span>
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
