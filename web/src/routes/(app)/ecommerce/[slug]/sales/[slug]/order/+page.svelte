<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data;
    const { unit, orders, statusFilter } = data;
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);
    const TABS = ['all','DRAFT','PENDING','PROCESSING','SHIPPED','CLOSED','CANCELLED'];
    const TAB_LABEL = { all:'Semua', DRAFT:'Draft', PENDING:'Pending', PROCESSING:'Proses', SHIPPED:'Dikirim', CLOSED:'Selesai', CANCELLED:'Dibatalkan' };
    const STATUS_COLOR = { DRAFT:'bg-slate-100 text-slate-600', PENDING:'bg-amber-100 text-amber-700', PROCESSING:'bg-sky-100 text-sky-700', SHIPPED:'bg-blue-100 text-blue-700', CLOSED:'bg-emerald-100 text-emerald-700', CANCELLED:'bg-rose-100 text-rose-700' };
    const NEXT_STATUS = { PENDING:'PROCESSING', PROCESSING:'SHIPPED', SHIPPED:'CLOSED' };
    let expanded = null;
</script>

<PageLayout title="Sales Order" subtitle="Daftar pesanan penjualan" badge="Sales" slug={unit.slug} {unit}>
    <!-- Status Tabs -->
    <div class="flex gap-1 mt-4 mb-4 overflow-x-auto pb-1">
        {#each TABS as tab}
        <a href={`?status=${tab}`}
            class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition
            {statusFilter === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}">
            {TAB_LABEL[tab]}
        </a>
        {/each}
    </div>

    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-5 py-3">Nomor SO</th><th class="px-5 py-3">Pelanggan</th>
                    <th class="px-5 py-3 text-right">Total</th><th class="px-5 py-3 text-center">Status</th>
                    <th class="px-5 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each orders as order}
                <tr class="text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    on:click={() => expanded = expanded === order.id ? null : order.id}>
                    <td class="px-5 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{order.orderNumber}</td>
                    <td class="px-5 py-3 text-slate-600 dark:text-slate-400">{order.customer?.nama || '—'}</td>
                    <td class="px-5 py-3 text-right font-black text-slate-800 dark:text-white">{fmt(order.totalAmount)}</td>
                    <td class="px-5 py-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {STATUS_COLOR[order.status] || ''}">{order.status}</span>
                    </td>
                    <td class="px-5 py-3 text-center" on:click|stopPropagation>
                        {#if NEXT_STATUS[order.status]}
                        <form method="POST" action="?/updateStatus" use:enhance>
                            <input type="hidden" name="order_id" value={order.id} />
                            <input type="hidden" name="status" value={NEXT_STATUS[order.status]} />
                            <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition">
                                → {NEXT_STATUS[order.status]}
                            </button>
                        </form>
                        {/if}
                    </td>
                </tr>
                {#if expanded === order.id}
                <tr class="bg-slate-50 dark:bg-slate-800/30">
                    <td colspan="5" class="px-5 py-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detail Item</p>
                        <div class="space-y-1">
                            {#each order.items as item}
                            <div class="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span>{item.product?.nama || 'Produk'} × {item.qty}</span>
                                <span class="font-bold">{fmt(item.total)}</span>
                            </div>
                            {/each}
                        </div>
                        {#if order.notes}<p class="mt-2 text-[10px] text-slate-400 italic">Catatan: {order.notes}</p>{/if}
                    </td>
                </tr>
                {/if}
                {:else}
                <tr><td colspan="5" class="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada sales order</td></tr>
                {/each}
            </tbody>
        </table>
    </div>
</PageLayout>
