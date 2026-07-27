<script>
    import { page } from '$app/stores';
    export let data; 
    let selectedTrx = null; // State untuk menyimpan transaksi yang dipilih

    function openDetail(trx) {
        selectedTrx = trx;
    }

    function closeDetail() {
        selectedTrx = null;
    }

    $: stats = [
        { label: "Total Penjualan", value: `Rp ${data.stats.totalSales.toLocaleString('id-ID')}`, trend: "+12%", color: "text-green-500" },
        { label: "Total Pesanan", value: data.stats.totalOrders.toString(), trend: "+5%", color: "text-blue-500" },
        { label: "Rata-rata Per Order", value: `Rp ${Math.round(data.stats.averageTicket).toLocaleString('id-ID')}`, trend: "-2%", color: "text-slate-500 dark:text-slate-400 dark:text-slate-500" },
        { label: "Produk Terlaris", value: data.stats.topProduct, trend: "Hot", color: "text-orange-500" }
    ];

    let recentTransactions = data.recentOrders || [];
    let topProducts = data.topProducts || [];
    let isReturning = false;

    async function processRetur(trx) {
        if (!confirm("Anda yakin ingin melakukan retur (Full Refund) untuk transaksi ini? Stok akan dikembalikan dan jurnal akan dibalik.")) return;
        
        isReturning = true;
        try {
            const items = trx.items.map(item => ({
                order_item_id: item.order_item_id,
                product_id: item.product_id,
                qty_returned: item.qty,
                refund_amount: item.total
            }));

            const res = await fetch(`/finance/${$page.params.slug}/pos/retur`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: trx.id,
                    items: items,
                    reason: 'Full Refund via POS Reports'
                })
            });

            const result = await res.json();
            if (res.ok) {
                alert(`Retur berhasil dengan referensi: ${result.returnNumber}`);
                // Update local state
                selectedTrx.status = 'REFUNDED';
                recentTransactions = recentTransactions.map(t => t.id === trx.id ? { ...t, status: 'REFUNDED' } : t);
            } else {
                alert("Gagal melakukan retur: " + result.error);
            }
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            isReturning = false;
        }
    }
</script>

<div class="flex h-screen bg-[#F1F5F9] font-sans antialiased text-slate-900 dark:text-white overflow-hidden">
    <aside class="w-20 bg-slate-900 flex flex-col items-center py-6 shrink-0 z-10 shadow-xl">
        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-10 shadow-lg shadow-blue-500/20">B</div>
        <nav class="flex flex-col gap-6 flex-1">
            <a href={`/finance/${$page.params.slug}/pos`} class="text-slate-500 dark:text-slate-400 dark:text-slate-500 p-3 hover:text-white transition-all">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </a>
            <a href={`/finance/${$page.params.slug}/reports`} class="text-blue-400 p-3 rounded-md bg-blue-500/10 transition-all border border-blue-500/20">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </a>
        </nav>
    </aside>

    <main class="flex-1 flex flex-col p-6 overflow-y-auto">
        <header class="mb-6 flex justify-between items-end">
            <div>
                <h1 class="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Business Analytics</h1>
                <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Laporan Penjualan Real-time</p>
            </div>
            <div class="flex gap-2">
                <button class="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all">Export PDF</button>
                <button class="bg-blue-600 px-4 py-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md">Refresh Data</button>
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {#each stats as stat}
                <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-200 transition-all">
                    <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{stat.label}</p>
                    <div class="flex items-end justify-between">
                        <h2 class="text-lg font-black text-slate-900 dark:text-white font-mono">{stat.value}</h2>
                        <span class="text-[10px] font-black {stat.color} bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md">{stat.trend}</span>
                    </div>
                </div>
            {/each}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Transaksi Terakhir</h3>
                    <div class="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800/80 mx-4"></div>
                    <button class="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Lihat Semua</button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                                <th class="pb-3">ID TRX</th>
                                <th class="pb-3">WAKTU</th>
                                <th class="pb-3">PELANGGAN</th>
                                <th class="pb-3">TOTAL</th>
                                <th class="pb-3 text-right">STATUS</th>
                            </tr>
                        </thead>
        <tbody>
    {#each recentTransactions as trx}
        <tr 
            on:click={() => openDetail(trx)} 
            class="group cursor-pointer hover:bg-blue-50/50 transition-all border-b border-slate-50 dark:border-slate-800"
        >
            <td class="py-4 font-mono text-[10px] text-blue-600 font-bold">
                #{trx.id.toString().slice(-5)}
            </td>

            <td class="py-4 text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                {new Date(trx.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </td>

            <td class="py-4">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        {trx.customer}
                    </span>
                    <span class="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[180px]">
                        {trx.items?.length || 0} Produk
                    </span>
                </div>
            </td>

            <td class="py-4 text-[11px] font-black text-slate-900 dark:text-white font-mono">
                Rp {Number(trx.nominal).toLocaleString('id-ID')}
            </td>

            <td class="py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <span class="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest 
                        {trx.metode_bayar === 'CASH' || trx.payment_method === 'CASH' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}">
                        {trx.metode_bayar || trx.payment_method || 'CASH'}
                    </span>
                    {#if trx.id}
                    <a href="/api/invoice/{trx.id}?type=pos" target="_blank"
                       class="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                       title="Lihat Invoice" on:click|stopPropagation>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </a>
                    {/if}
                </div>
            </td>
        </tr>
    {/each}
</tbody>
                    </table>
                </div>
            </div>

            <div class="bg-slate-900 rounded-md p-6 text-white flex flex-col shadow-xl">
                <div class="flex items-center justify-between mb-8">
                    <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tren Mingguan</h3>
                    <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                </div>
                
                <div class="flex-1 flex items-end justify-between gap-2 px-2">
                    {#each [40, 70, 45, 90, 65, 80, 55] as height}
                        <div class="flex flex-col items-center gap-2 w-full group">
                            <div class="w-full bg-slate-800 rounded-t-md relative flex items-end justify-center hover:bg-blue-600 transition-all cursor-pointer" style="height: {height}%">
                                <span class="absolute -top-6 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{height}%</span>
                            </div>
                            <span class="text-[7px] font-black text-slate-600 dark:text-slate-300 uppercase">D{height % 7}</span>
                        </div>
                    {/each}
                </div>
                
                <div class="mt-8 p-4 bg-slate-800/50 rounded-md border border-white/5">
                    <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 text-center">Rangkuman Performa</p>
                    <p class="text-[10px] font-black text-blue-400 text-center uppercase tracking-tighter">Naik 15.4% dari minggu lalu</p>
                </div>
            </div>
        </div>
    </main>
</div>
{#if selectedTrx}
<div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-800 w-full max-w-md rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div>
                <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Detail Sesi Transaksi</h3>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">ID: {selectedTrx.id}</p>
            </div>
            <button on:click={closeDetail} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        <div class="p-6 space-y-6">
            <div class="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-700 pb-4">
                <div>
                    <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Waktu</span>
                    <p class="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        {new Date(selectedTrx.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                        <span class="text-blue-500 ml-1">{new Date(selectedTrx.tanggal).toLocaleTimeString('id-ID')}</span>
                    </p>
                </div>
                <div class="text-right">
                    <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Metode</span>
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase">
                        {selectedTrx.metode_bayar}
                    </span>
                </div>
            </div>

            <div class="space-y-4">
                <div>
                    <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Pelanggan</span>
                    <p class="text-sm font-black text-slate-900 dark:text-white uppercase">
                        {selectedTrx.customer}
                    </p>
                </div>
                
               <div class="bg-slate-50 dark:bg-slate-900 rounded-md p-4 border border-slate-100 dark:border-slate-800">
                    <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-3 tracking-widest">Rincian Produk</span>
                    <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {#if selectedTrx.items && selectedTrx.items.length > 0}
                            {#each selectedTrx.items as item}
                                <div class="bg-white dark:bg-slate-800 p-3 rounded-md shadow-sm border border-slate-50 dark:border-slate-800">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">{item.product_name}</span>
                                        <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                                            {item.qty}x
                                        </span>
                                    </div>
                                    <div class="flex justify-between items-center border-t border-slate-50 dark:border-slate-800 pt-2 mt-1">
                                        <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold">@Rp {item.price.toLocaleString('id-ID')}</span>
                                        <span class="text-[11px] font-mono font-black text-slate-900 dark:text-white">
                                            Rp {item.total.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            {/each}
                        {:else}
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 italic">Data produk tidak tersedia</p>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Total Section -->
            <div class="flex justify-between items-center pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 mt-6">
                <span class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Total Bayar</span>
                <span class="text-2xl font-black text-blue-600 font-mono tracking-tighter italic">
                    Rp {selectedTrx.total.toLocaleString('id-ID')}
                </span>
            </div>
            
            {#if selectedTrx.status === 'PAID'}
                <button on:click={() => processRetur(selectedTrx)} disabled={isReturning} class="w-full bg-red-50 text-red-600 hover:bg-red-500 hover:text-white mt-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    {isReturning ? 'Memproses...' : 'Retur Transaksi'}
                </button>
            {:else if selectedTrx.status === 'REFUNDED'}
                <div class="w-full bg-red-100/50 text-red-500 mt-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-center border border-red-200">
                    Telah Diretur
                </div>
            {/if}

            <div class="pt-4 flex justify-between items-center border-t-2 border-slate-100 dark:border-slate-800">
                <span class="text-xs font-black text-slate-900 dark:text-white uppercase">Total Nominal</span>
                <span class="text-xl font-mono font-black text-blue-600">
                    Rp {Number(selectedTrx.nominal).toLocaleString('id-ID')}
                </span>
            </div>
        </div>

        <div class="p-4 bg-slate-50 dark:bg-slate-900 flex gap-2">
            <button class="flex-1 py-3 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg">
                Cetak Struk
            </button>
        </div>
    </div>
</div>
{/if}
<style>
    :global(body) { background-color: #F1F5F9; }
</style>