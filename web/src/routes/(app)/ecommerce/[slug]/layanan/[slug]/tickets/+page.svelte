<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit, tickets, contacts, statusFilter, priorityFilter } = data;
    const PRIORITY_COLOR = { LOW:'bg-slate-100 text-slate-600', MEDIUM:'bg-blue-100 text-blue-700', HIGH:'bg-orange-100 text-orange-700', URGENT:'bg-rose-100 text-rose-700' };
    const STATUS_COLOR = { OPEN:'bg-amber-100 text-amber-700', IN_PROGRESS:'bg-sky-100 text-sky-700', RESOLVED:'bg-emerald-100 text-emerald-700', CLOSED:'bg-slate-100 text-slate-500' };
    const NEXT_STATUS = { OPEN:'IN_PROGRESS', IN_PROGRESS:'RESOLVED', RESOLVED:'CLOSED' };
    let showModal = false;
    let selectedTicket = null;
    let replyText = '';
    $: if (form?.success) { showModal = false; replyText = ''; }
    const STATUSES = ['all','OPEN','IN_PROGRESS','RESOLVED','CLOSED'];
    const STATUS_LABELS = { all:'Semua', OPEN:'Terbuka', IN_PROGRESS:'Diproses', RESOLVED:'Selesai', CLOSED:'Ditutup' };
</script>

<PageLayout title="Tiket Pelanggan" subtitle="Kelola keluhan dan pertanyaan pelanggan" badge="CS" slug={unit.slug} {unit}>
    <div slot="actions">
        <button on:click={() => showModal = true}
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            + Buat Tiket
        </button>
    </div>

    <!-- Status Tabs -->
    <div class="flex gap-1 mt-4 mb-4 overflow-x-auto pb-1">
        {#each STATUSES as s}
        <a href={`?status=${s}&priority=${priorityFilter}`}
            class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition
            {statusFilter === s ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}">
            {STATUS_LABELS[s]}
        </a>
        {/each}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" in:fade>
        <!-- Ticket List -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                    <tr>
                        <th class="px-4 py-3">Tiket</th><th class="px-4 py-3">Pelanggan</th>
                        <th class="px-4 py-3 text-center">Prioritas</th><th class="px-4 py-3 text-center">Status</th>
                        <th class="px-4 py-3 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                    {#each tickets as ticket}
                    <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        on:click={() => selectedTicket = selectedTicket?.id === ticket.id ? null : ticket}>
                        <td class="px-4 py-3">
                            <div class="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{ticket.subject}</div>
                            <div class="text-[9px] text-slate-400 font-mono mt-0.5">#{ticket.ticketNumber}</div>
                        </td>
                        <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{ticket.customer?.nama || 'Anonim'}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {PRIORITY_COLOR[ticket.priority] || ''}">{ticket.priority}</span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {STATUS_COLOR[ticket.status] || ''}">{ticket.status}</span>
                        </td>
                        <td class="px-4 py-3 text-center" on:click|stopPropagation>
                            {#if NEXT_STATUS[ticket.status]}
                            <form method="POST" action="?/updateStatus" use:enhance>
                                <input type="hidden" name="ticket_id" value={ticket.id} />
                                <input type="hidden" name="status" value={NEXT_STATUS[ticket.status]} />
                                <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-100 transition">
                                    → {NEXT_STATUS[ticket.status].replace('_',' ')}
                                </button>
                            </form>
                            {/if}
                        </td>
                    </tr>
                    {:else}
                    <tr><td colspan="5" class="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Tidak ada tiket</td></tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <!-- Detail Panel -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            {#if selectedTicket}
            <div class="p-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-start justify-between gap-2 mb-1">
                    <p class="text-xs font-black text-slate-800 dark:text-white leading-snug">{selectedTicket.subject}</p>
                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {STATUS_COLOR[selectedTicket.status] || ''}">{selectedTicket.status}</span>
                </div>
                <p class="text-[9px] text-slate-400 font-mono">#{selectedTicket.ticketNumber}</p>
                {#if selectedTicket.description}
                    <p class="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{selectedTicket.description}</p>
                {/if}
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                {#each selectedTicket.messages as msg}
                <div class="flex {msg.senderType === 'STAFF' ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[85%] rounded-xl px-3 py-2 text-[11px]
                        {msg.senderType === 'STAFF' ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                        {msg.message}
                    </div>
                </div>
                {:else}
                    <p class="text-center text-[10px] text-slate-400 py-4">Belum ada percakapan</p>
                {/each}
            </div>
            <div class="p-4 border-t border-slate-100 dark:border-slate-800">
                <form method="POST" action="?/addMessage" use:enhance class="flex gap-2">
                    <input type="hidden" name="ticket_id" value={selectedTicket.id} />
                    <input type="text" name="message" bind:value={replyText} placeholder="Balas tiket..."
                        class="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                    <button type="submit"
                        class="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black transition">Kirim</button>
                </form>
            </div>
            {:else}
            <div class="flex-1 flex items-center justify-center text-center p-8">
                <div>
                    <div class="text-3xl mb-3">📋</div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih tiket untuk melihat detail</p>
                </div>
            </div>
            {/if}
        </div>
    </div>
</PageLayout>

<!-- Modal Buat Tiket -->
{#if showModal}
<div class="fixed inset-0 z-[500] bg-slate-900/70 flex items-center justify-center p-4" transition:fade={{duration:120}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
            <p class="font-black text-sm uppercase">Buat Tiket Baru</p>
            <button on:click={() => showModal = false} class="text-slate-400 hover:text-rose-500">✕</button>
        </div>
        <form method="POST" action="?/create" use:enhance class="p-5 space-y-4">
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Subjek *</label>
                <input type="text" name="subject" required placeholder="Deskripsi singkat masalah..."
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Prioritas</label>
                    <select name="priority" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option value="LOW">Low</option><option value="MEDIUM" selected>Medium</option>
                        <option value="HIGH">High</option><option value="URGENT">Urgent</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Pelanggan</label>
                    <select name="customer_id" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option value="">-- Pilih --</option>
                        {#each contacts as c}<option value={c.id}>{c.nama}</option>{/each}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Deskripsi</label>
                <textarea name="description" rows="3" placeholder="Detail masalah..."
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none"></textarea>
            </div>
            <div class="flex gap-3">
                <button type="button" on:click={() => showModal = false}
                    class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-black uppercase">Batal</button>
                <button type="submit"
                    class="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase shadow-md">Simpan</button>
            </div>
        </form>
    </div>
</div>
{/if}
