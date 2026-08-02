<script>
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { notifUpdate } from '$lib/realtimeStore';
    export let data;

    let filterAktif = 'Semua';
    const kategoriTersedia = ['Semua', 'Produk', 'Unit Bisnis', 'Keuangan'];
    
    $: filteredData = filterAktif === 'Semua' 
        ? data.riwayatGlobal 
        : (data.riwayatGlobal || []).filter((/** @type {any} */ d) => d.kategori === filterAktif);

   function tanganiKlikNotif(/** @type {any} */ log) {
        if (log.link && log.link !== "NULL") {
            goto(log.link);
        } else {
            console.warn("Aksi ini tidak memiliki link tujuan lurd!");
        }
    }

   // Listen for realtime notifications via Socket.io
   $: if ($notifUpdate) {
        data.riwayatGlobal = [$notifUpdate, ...(data.riwayatGlobal || [])].slice(0, 15);
    }
</script>

<div class="max-w-4xl mx-auto px-6 py-8">
    <div class="flex justify-between items-end mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
            <h2 class="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Aktivitas Sistem</h2>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pusat Notifikasi</h1>
        </div>
        
        <div class="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-md gap-0.5">
            {#each kategoriTersedia as kat}
                <button 
                    on:click={() => filterAktif = kat}
                    class="px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all 
                    {filterAktif === kat ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200'}">
                    {kat}
                </button>
            {/each}
        </div>
    </div>

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
        <table class="w-full text-left">
            <thead class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Waktu</th>
                    <th class="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aktivitas</th>
                    <th class="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                {#each filteredData as log}
                    <tr 
                        on:click={() => tanganiKlikNotif(log)}
                        class="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    >
                        <td class="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            {new Date(log.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td class="px-6 py-4">
                            <p class="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{log.pesan}</p>
                            <span class="text-[8px] font-black text-indigo-500 uppercase mt-1 block">{log.kategori}</span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <span class="px-2 py-1 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                                BERHASIL
                            </span>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>