<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    import { ecommerceOrderUpdate } from '$lib/realtimeStore';
    import { invalidate } from '$app/navigation';
    export let data;
    const { unit } = data;
    let orders = data.orders || [];
    let stats = data.stats || {};
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);

    const PAY_COLOR = { PENDING:'bg-amber-100 text-amber-700', PAID:'bg-emerald-100 text-emerald-700', FAILED:'bg-rose-100 text-rose-700', EXPIRED:'bg-slate-100 text-slate-500' };
    const SHIP_COLOR = { PENDING:'bg-slate-100 text-slate-500', PROCESSING:'bg-sky-100 text-sky-700', SHIPPED:'bg-blue-100 text-blue-700', DELIVERED:'bg-emerald-100 text-emerald-700' };
    const SHIP_NEXT = { PENDING:'PROCESSING', PROCESSING:'SHIPPED', SHIPPED:'DELIVERED' };

    let expanded = null;

    // Realtime: auto-update saat ada order baru/update
    $: if ($ecommerceOrderUpdate) {
        invalidate('ecommerce:orders').catch(() => {});
    }
    $: orders = data.orders || [];
    $: stats = data.stats || {};

    const PAYMENT_TABS = ['all','PENDING','PAID','FAILED','EXPIRED'];
    const PAY_LABELS = { all:'Semua', PENDING:'Belum Bayar', PAID:'Lunas', FAILED:'Gagal', EXPIRED:'Kedaluwarsa' };
</script>

<PageLayout title="Pesanan Online" subtitle="Kelola order dari toko online kamu" badge="Ecommerce" slug={unit.slug} {unit}>

    {#if data.migrationNeeded}
    <div class="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl" in:fade>
        <p class="text-sm font-bold text-amber-700">⚠️ Tabel ecommerce_orders belum ada.</p>
        <p class="text-xs text-amber-600 mt-1">Jalankan migration: <code class="bg-amber-100 px-1 rounded">mysql -u root db_name &lt; drizzle/migrations/0002_sprint2_modules.sql</code></p>
    </div>
    {:else}

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4" in:fade>
        {#each [
            { label:'Total Order', value: Number(stats.totalOrders||0).toLocaleString('id-ID'), color:'text-slate-800 dark:text-white' },
            { label:'Total Revenue', value: fmt(stats.totalRevenue||0), color:'text-emerald-600' },
            { label:'Menunggu Bayar', value: Number(stats.pendingCount||0).toLocaleString('id-ID'), color:'text-amber-600' },
            { label:'Sudah Lunas', value: Number(stats.paidCount||0).toLocaleString('id-ID'), color:'text-emerald-600' },
        ] as s}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p class="text-xl font-black {s.color}">{s.value}</p>
        </div>
        {/each}
    </div>

    <!-- Status Tabs -->
    <div class="flex gap-1 mt-5 mb-4 overflow-x-auto pb-1">
        {#each PAYMENT_TABS as tab}
        <a href={`?status=${tab}&shipping=${data.shippingFilter}`}
            class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition
            {data.statusFilter === tab ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}">
            {PAY_LABELS[tab]}
        </a>
        {/each}
    </div>

    <!-- Orders Table -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden" in:fade>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-4 py-3">Order</th>
                    <th class="px-4 py-3">Pelanggan</th>
                    <th class="px-4 py-3 text-right">Total</th>
                    <th class="px-4 py-3 text-center">Bayar</th>
                    <th class="px-4 py-3 text-center">Kirim</th>
                    <th class="px-4 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each orders as order}
                <tr class="text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    on:click={() => expanded = expanded === order.id ? null : order.id}>
                    <td class="px-4 py-3">
                        <p class="font-bold text-slate-800 dark:text-white font-mono">{order.orderNumber}</p>
                        <p class="text-[9px] text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>
                    </td>
                    <td class="px-4 py-3">
                        <p class="font-semibold text-slate-700 dark:text-slate-300">{order.customerName}</p>
                        <p class="text-[9px] text-slate-400">{order.customerPhone || order.customerEmail || '—'}</p>
                    </td>
                    <td class="px-4 py-3 text-right font-black text-slate-800 dark:text-white">{fmt(order.totalAmount)}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase {PAY_COLOR[order.paymentStatus] || ''}">
                            {order.paymentStatus}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {SHIP_COLOR[order.shippingStatus] || ''}">
                            {order.shippingStatus}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center" on:click|stopPropagation>
                        {#if SHIP_NEXT[order.shippingStatus] && order.paymentStatus === 'PAID'}
                        <form method="POST" action="?/updateShipping" use:enhance>
                            <input type="hidden" name="order_id" value={order.id} />
                            <input type="hidden" name="shipping_status" value={SHIP_NEXT[order.shippingStatus]} />
                            <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition uppercase">
                                → {SHIP_NEXT[order.shippingStatus]}
                            </button>
                        </form>
                        {:else}
                            <span class="text-[9px] text-slate-300">—</span>
                        {/if}
                    </td>
                </tr>
                {#if expanded === order.id}
                <tr class="bg-slate-50/80 dark:bg-slate-800/30">
                    <td colspan="6" class="px-5 py-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Pesanan</p>
                                {#each order.items as item}
                                <div class="flex justify-between text-xs text-slate-600 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <span>{item.productName} × {item.qty}</span>
                                    <span class="font-bold">{fmt(item.total)}</span>
                                </div>
                                {:else}
                                <p class="text-[10px] text-slate-400">Tidak ada item detail</p>
                                {/each}
                            </div>
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Alamat Pengiriman</p>
                                <p class="text-xs text-slate-600 dark:text-slate-400">{order.shippingAddress || '—'}</p>
                                {#if order.transactionId}
                                <p class="text-[9px] text-slate-400 mt-2">Transaction ID: <span class="font-mono">{order.transactionId}</span></p>
                                {/if}
                                {#if order.discountAmount > 0}
                                <div class="mt-2 flex justify-between text-xs">
                                    <span class="text-slate-500">Diskon:</span>
                                    <span class="text-rose-500 font-bold">-{fmt(order.discountAmount)}</span>
                                </div>
                                {/if}
                                <div class="mt-1 flex justify-between text-sm font-black">
                                    <span class="text-slate-700 dark:text-slate-300">Total Bayar:</span>
                                    <span class="text-emerald-600">{fmt(order.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
                {/if}
                {:else}
                <tr>
                    <td colspan="6" class="py-14 text-center text-slate-400 font-bold uppercase text-[10px]">
                        Belum ada pesanan masuk
                    </td>
                </tr>
                {/each}
            </tbody>
        </table>
    </div>
    {/if}
</PageLayout>
