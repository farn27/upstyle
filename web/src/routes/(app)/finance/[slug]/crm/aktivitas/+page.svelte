<script>
    import { page } from '$app/stores';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    const { unit, aktivitasList, kontakList } = data;
    $: slug = $page.params.slug;

    let isAddModalOpen = false;

    function formatDate(val) {
        if (!val) return '';
        return new Date(val).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">CRM / Aktivitas</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Aktivitas Interaksi</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Catatan histori komunikasi dengan pelanggan dan prospek.</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Aktivitas
        </button>
    </div>

    <SubNav {slug} />

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        {#if aktivitasList.length === 0}
            <div class="p-12 text-center flex flex-col items-center">
                <div class="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Belum ada aktivitas</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 max-w-sm">Catat setiap telepon, meeting, atau pesan WA dengan prospek/pelanggan Anda di sini.</p>
            </div>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tipe</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Kontak</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Catatan</th>
                            <th class="py-3 px-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody class="text-xs divide-y divide-slate-100">
                        {#each aktivitasList as row}
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors">
                                <td class="py-3 px-4 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                                    {formatDate(row.tanggal)}
                                </td>
                                <td class="py-3 px-4">
                                    <span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {row.tipe}
                                    </span>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="font-bold text-slate-900 dark:text-white">{row.contact?.nama || '—'}</div>
                                    {#if row.contact?.perusahaan}
                                        <div class="text-[10px] text-slate-400 dark:text-slate-500">{row.contact.perusahaan}</div>
                                    {/if}
                                </td>
                                <td class="py-3 px-4 text-slate-700 dark:text-slate-200 w-1/2">
                                    {row.catatan || '—'}
                                </td>
                                <td class="py-3 px-4 text-right">
                                    <!-- Aksi button placeholder -->
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>
