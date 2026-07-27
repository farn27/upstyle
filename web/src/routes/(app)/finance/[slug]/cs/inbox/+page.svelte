<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import SubNav from '$lib/components/SubNav.svelte';
    
    export let data;
    const { tickets, activeTicket, messages, userId } = data;
    $: slug = $page.params.slug;
    $: ticketIdParam = $page.url.searchParams.get('ticketId');

    let isSubmitting = false;

    function getPriorityColor(priority) {
        switch(priority) {
            case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }
</script>

<PageLayout title="Support Inbox" subtitle="Layanan Pelanggan Terpadu">
    <svelte:fragment slot="actions">
        <SubNav {slug} />
    </svelte:fragment>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-220px)] min-h-[600px] flex">
        
        <!-- SIDEBAR: List Tiket -->
        <div class="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
            <div class="p-4 border-b border-slate-200 bg-white">
                <input type="text" placeholder="Cari tiket..." class="w-full rounded-lg border-slate-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm">
            </div>
            
            <div class="flex-1 overflow-y-auto">
                {#each tickets as ticket}
                    <a href={`?ticketId=${ticket.id}`} class="block p-4 border-b border-slate-100 hover:bg-white transition {ticketIdParam === String(ticket.id) ? 'bg-white border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}">
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-bold text-slate-900 text-sm line-clamp-1">{ticket.subject}</span>
                            <span class="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString('id-ID') : ''}
                            </span>
                        </div>
                        <div class="text-xs text-slate-500 mb-2">{ticket.customerName || 'Anonim'} - #{ticket.ticketNumber}</div>
                        <div class="flex gap-2">
                            <span class={`px-2 py-0.5 text-[10px] font-black rounded border uppercase ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                            <span class="px-2 py-0.5 text-[10px] font-black rounded border border-slate-200 bg-slate-100 text-slate-600 uppercase">{ticket.status}</span>
                        </div>
                    </a>
                {/each}
                {#if tickets.length === 0}
                    <div class="p-6 text-center text-sm text-slate-500">Belum ada tiket support.</div>
                {/if}
            </div>
        </div>

        <!-- MAIN CHAT AREA -->
        <div class="w-2/3 flex flex-col bg-white">
            {#if activeTicket}
                <!-- Chat Header -->
                <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
                    <div>
                        <h2 class="font-bold text-lg text-slate-900 leading-tight">{activeTicket.subject}</h2>
                        <p class="text-xs text-slate-500">{activeTicket.customer?.nama || 'Anonim'} &bull; #{activeTicket.ticketNumber}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Tutup Tiket</button>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div class="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
                    <!-- Pesan Awal (Deskripsi) -->
                    <div class="flex flex-col items-start">
                        <div class="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
                            <p class="text-sm text-slate-800 whitespace-pre-wrap">{activeTicket.description}</p>
                        </div>
                        <span class="text-[10px] text-slate-400 mt-1 ml-2">{new Date(activeTicket.createdAt).toLocaleString('id-ID')}</span>
                    </div>

                    <!-- Balasan -->
                    {#each messages as msg}
                        <div class={`flex flex-col ${msg.senderType === 'STAFF' ? 'items-end' : 'items-start'}`}>
                            <div class={`p-4 rounded-2xl shadow-sm max-w-[80%] ${msg.senderType === 'STAFF' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                                <p class="text-sm whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <span class="text-[10px] text-slate-400 mt-1 mx-2">
                                {new Date(msg.createdAt).toLocaleString('id-ID')} 
                                {msg.senderType === 'STAFF' ? ' (Anda)' : ''}
                            </span>
                        </div>
                    {/each}
                </div>

                <!-- Chat Input Form -->
                <div class="p-4 border-t border-slate-200 bg-white">
                    <form method="POST" action="?/replyTicket" use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                            isSubmitting = false;
                            update(); // reload data form
                        };
                    }}>
                        <input type="hidden" name="ticketId" value={activeTicket.id}>
                        <div class="flex items-end gap-3">
                            <textarea 
                                name="message" 
                                rows="2" 
                                required
                                class="flex-1 resize-none rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3" 
                                placeholder="Ketik balasan Anda di sini..."></textarea>
                            <button type="submit" disabled={isSubmitting} class="p-3 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition disabled:opacity-50">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </div>
                    </form>
                </div>
            {:else}
                <div class="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <svg class="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <p class="text-sm font-bold">Pilih tiket untuk melihat percakapan</p>
                </div>
            {/if}
        </div>
    </div>
</PageLayout>
