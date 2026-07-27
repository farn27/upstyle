<script>
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';

    export let data;
    const { unit, stats, recentTickets, channels } = data;

    function getPriorityColor(priority) {
        switch(priority) {
            case 'LOW': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
            case 'MEDIUM': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
            case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400';
            case 'URGENT': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 animate-pulse';
            default: return 'bg-slate-100 text-slate-700';
        }
    }

    function getStatusColor(status) {
        switch(status) {
            case 'OPEN': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400';
            case 'IN_PROGRESS': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400';
            case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400';
            case 'CLOSED': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-slate-100 text-slate-600';
        }
    }

    function timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'baru saja';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
        return date.toLocaleDateString('id-ID');
    }
</script>

<PageLayout title="Layanan Pelanggan" subtitle="Pusat bantuan (Helpdesk) dan penanganan keluhan pelanggan" badge={unit?.tipe || 'General'} slug={unit.slug} unit={unit}>
    
    <div slot="actions" class="flex flex-wrap items-center gap-2">
        <a href={`/ecommerce/${unit.slug}/layanan`} class="px-3 py-2 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md">
            Dashboard
        </a>
        <a href={`/ecommerce/${unit.slug}/layanan/tickets`} class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition">
            Tiket Pelanggan
        </a>
    </div>
    
    <!-- METRICS GRID -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6" in:fade={{ duration: 150 }}>
        <!-- Card 1: Open Tickets -->
        <div class="bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl p-5 shadow-md text-white relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-white/70">Tiket Terbuka</p>
                    <h3 class="text-3xl font-black mt-1">{stats.openTickets}</h3>
                </div>
                <div class="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-white/10 relative z-10">
                <a href={`/ecommerce/${unit.slug}/layanan/tickets?status=OPEN`} class="text-[9px] font-bold uppercase tracking-wider text-white hover:text-white/80 flex items-center gap-1 transition">
                    Lihat Tiket Menunggu <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>

        <!-- Card 2: Urgent Tickets -->
        <div class="bg-white dark:bg-slate-850 border-t-4 border-t-rose-500 border-x border-b border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Status Urgent</p>
                    <h3 class="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">{stats.urgentTickets}</h3>
                </div>
                <div class="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <a href={`/ecommerce/${unit.slug}/layanan/tickets?priority=URGENT`} class="text-[9px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 flex items-center gap-1 transition">
                    Tangani Segera <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>

        <!-- Card 3: Resolved Tickets -->
        <div class="bg-white dark:bg-slate-850 border-t-4 border-t-emerald-500 border-x border-b border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tiket Terselesaikan</p>
                    <h3 class="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{stats.resolvedTickets}</h3>
                </div>
                <div class="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <a href={`/ecommerce/${unit.slug}/layanan/tickets?status=RESOLVED`} class="text-[9px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition">
                    Lihat Histori <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <!-- TICKETS TERBARU -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" in:fade={{ duration: 150, delay: 100 }}>
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Antrean Tiket Terbaru</h2>
                <a href={`/ecommerce/${unit.slug}/layanan/tickets`} class="text-[10px] font-bold uppercase text-cyan-600 hover:underline">Semua Tiket</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50/50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th class="px-5 py-3">Tiket</th>
                            <th class="px-5 py-3">Pelanggan</th>
                            <th class="px-5 py-3">Prioritas</th>
                            <th class="px-5 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                        {#each recentTickets as ticket}
                            <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer" on:click={() => window.location.href = `/ecommerce/${unit.slug}/layanan/tickets/${ticket.id}`}>
                                <td class="px-5 py-3">
                                    <div class="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{ticket.subject}</div>
                                    <div class="text-[9px] text-slate-500 font-mono mt-0.5">#{ticket.ticketNumber} &bull; {timeAgo(ticket.createdAt)}</div>
                                </td>
                                <td class="px-5 py-3">
                                    {#if ticket.customer}
                                        <div class="font-medium text-slate-700 dark:text-slate-300">{ticket.customer.name}</div>
                                    {:else}
                                        <div class="text-slate-400 italic">Anonymous</div>
                                    {/if}
                                </td>
                                <td class="px-5 py-3">
                                    <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider {getPriorityColor(ticket.priority)}">
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td class="px-5 py-3 text-center">
                                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-transparent {getStatusColor(ticket.status)}">
                                        {ticket.status}
                                    </span>
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="4" class="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-wider">Hore! Tidak ada keluhan hari ini.</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- INBOX CHANNELS -->
        <div class="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" in:fade={{ duration: 150, delay: 150 }}>
            <div class="p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Saluran Integrasi</h2>
            </div>
            <div class="p-5 space-y-4">
                {#each ['WHATSAPP', 'EMAIL', 'INSTAGRAM'] as plat}
                    {@const isActive = channels.some(c => c.platform === plat && c.isActive)}
                    <div class="flex items-center justify-between p-3 rounded-lg border {isActive ? 'border-cyan-200 bg-cyan-50 dark:border-cyan-900/50 dark:bg-cyan-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'}">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white {plat === 'WHATSAPP' ? 'bg-green-500' : plat === 'EMAIL' ? 'bg-blue-500' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'}">
                                {#if plat === 'WHATSAPP'}
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                {:else if plat === 'EMAIL'}
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                {:else}
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                {/if}
                            </div>
                            <div>
                                <p class="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">{plat.toLowerCase()}</p>
                                <p class="text-[9px] text-slate-500 {isActive ? 'text-cyan-600 dark:text-cyan-400 font-medium' : ''}">{isActive ? 'Tersambung' : 'Tidak Terhubung'}</p>
                            </div>
                        </div>
                        <div>
                            {#if isActive}
                                <span class="relative flex h-2 w-2">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                </span>
                            {:else}
                                <button class="text-[9px] font-bold text-slate-400 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded px-2 py-1 transition">Hubungkan</button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</PageLayout>
