<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    export let data;

    function formatRupiah(num) {
        return 'Rp' + (num || 0).toLocaleString('id-ID');
    }

    const statusColors = {
        'PENDING': 'bg-slate-100 text-slate-600 border-slate-200',
        'PREPARING': 'bg-blue-50 text-blue-600 border-blue-200',
        'READY': 'bg-orange-50 text-orange-600 border-orange-200',
        'COMPLETED': 'bg-emerald-50 text-emerald-600 border-emerald-200'
    };

    const statusLabels = {
        'PENDING': 'Menunggu',
        'PREPARING': 'Diproses (Dapur)',
        'READY': 'Siap Diambil/Diantar',
        'COMPLETED': 'Selesai'
    };
</script>

<div class="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-sans">
    <div class="max-w-7xl mx-auto p-4 lg:p-6">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Unit</p>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white">Daftar Antrean & Dapur</h1>
                <p class="text-sm text-slate-500 mt-1">Pantau pesanan yang sedang diproses. Ubah status pesanan saat siap.</p>
            </div>
            <a href={`/finance/${$page.params.slug}/pos`} class="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                ← Kembali ke POS
            </a>
        </div>

        {#if data.orders.length === 0}
            <div class="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                Tidak ada pesanan aktif saat ini.
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each data.orders as order (order.id)}
                    <div class="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-black">{order.orderNumber}</h3>
                                <p class="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">{order.createdAt}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border {statusColors[order.fulfillmentStatus]}">
                                {statusLabels[order.fulfillmentStatus]}
                            </span>
                        </div>

                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">{order.orderType}</span>
                            {#if order.tableNumber}
                                <span class="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 uppercase">Meja: {order.tableNumber}</span>
                            {/if}
                            {#if order.queueNumber}
                                <span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[9px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 uppercase">Antrean: {order.queueNumber}</span>
                            {/if}
                        </div>

                        <div class="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700">
                            <ul class="space-y-2">
                                {#each order.items as item}
                                    <li class="flex justify-between items-start text-xs">
                                        <div class="font-bold flex-1 pr-2">
                                            <span class="text-blue-600">{item.qty}x</span> {item.productName}
                                        </div>
                                    </li>
                                {/each}
                            </ul>
                            {#if order.notes}
                                <div class="mt-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 text-[10px] text-orange-600 font-bold italic">
                                    Catatan: {order.notes}
                                </div>
                            {/if}
                        </div>

                        <div class="grid grid-cols-2 gap-2 mt-auto">
                            <form method="POST" action="?/updateFulfillment" use:enhance class="contents">
                                <input type="hidden" name="order_id" value={order.id} />
                                {#if order.fulfillmentStatus === 'PENDING'}
                                    <input type="hidden" name="status" value="PREPARING" />
                                    <button class="col-span-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition">Proses Dapur</button>
                                {:else if order.fulfillmentStatus === 'PREPARING'}
                                    <input type="hidden" name="status" value="READY" />
                                    <button class="col-span-2 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-orange-600 transition">Siap Diambil</button>
                                {:else if order.fulfillmentStatus === 'READY'}
                                    <input type="hidden" name="status" value="COMPLETED" />
                                    <button class="col-span-2 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition">Selesaikan Pesanan</button>
                                {/if}
                            </form>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 20px;
    }
    :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #475569;
    }
</style>
