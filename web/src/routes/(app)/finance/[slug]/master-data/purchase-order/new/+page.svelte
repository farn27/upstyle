<script>
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { addNotif } from '$lib/notifStore';
    
    export let data;
    const { unit, suppliers, products } = data;
    
    let items = [];
    let selectedProductId = "";
    let selectedQty = 1;
    let selectedPrice = 0;

    // Reactively update selected price when product changes
    $: {
        if (selectedProductId) {
            const p = products.find(x => x.id == selectedProductId);
            if (p) selectedPrice = p.hargaBeli || 0;
        }
    }

    function addItem() {
        if (!selectedProductId) return addNotif('Pilih produk dulu', 'error');
        if (selectedQty <= 0) return addNotif('Qty minimal 1', 'error');

        const p = products.find(x => x.id == selectedProductId);
        items = [...items, {
            productId: p.id,
            name: p.nama,
            sku: p.sku,
            qty: selectedQty,
            unitPrice: selectedPrice,
            subtotal: selectedQty * selectedPrice
        }];
        
        // reset form
        selectedProductId = "";
        selectedQty = 1;
        selectedPrice = 0;
    }

    function removeItem(index) {
        items = items.filter((_, i) => i !== index);
    }

    $: grandTotal = items.reduce((sum, it) => sum + it.subtotal, 0);

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
</script>

<div class="max-w-5xl mx-auto py-6 px-4 space-y-6">
    <div>
        <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Supply Chain / PO Baru</p>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">Buat Purchase Order</h1>
    </div>

    <form method="POST" action="?/createPO" use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success') {
                addNotif('Purchase Order berhasil dibuat!', 'success');
                goto(`/finance/${unit.slug}/master-data/purchase-order/${result.data.poId}`);
            } else {
                addNotif(result.data?.error || 'Gagal membuat PO', 'error');
            }
        };
    }}>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Kolom Utama -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Data Vendor -->
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 space-y-4">
                    <h2 class="font-black text-slate-800 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Pembelian</h2>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nomor PO (Auto)</label>
                            <input type="text" name="poNumber" placeholder="Kosongkan untuk Auto" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pilih Supplier <span class="text-red-500">*</span></label>
                            <select name="supplierId" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                                <option value="">-- Pilih Supplier --</option>
                                {#each suppliers as sup}
                                    <option value={sup.id}>{sup.namaSupplier}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Estimasi Kedatangan Barang</label>
                        <input type="date" name="expectedDate" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                    </div>
                </div>

                <!-- Input Barang -->
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 space-y-4">
                    <h2 class="font-black text-slate-800 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-700 pb-2">Daftar Barang</h2>
                    
                    <div class="flex flex-col sm:flex-row gap-2 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div class="flex-1 w-full">
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pilih Produk</label>
                            <select bind:value={selectedProductId} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="">-- Pilih Produk --</option>
                                {#each products as p}
                                    <option value={p.id}>[{p.sku}] {p.nama}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="w-24">
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Qty</label>
                            <input type="number" bind:value={selectedQty} min="1" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none text-center">
                        </div>
                        <div class="w-40">
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Harga Satuan (Rp)</label>
                            <input type="number" bind:value={selectedPrice} min="0" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                        </div>
                        <button type="button" on:click={addItem} class="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition h-[38px]">Tambah</button>
                    </div>

                    <div class="overflow-x-auto mt-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-black text-slate-500 uppercase">
                                <tr>
                                    <th class="py-2 px-3">Produk</th>
                                    <th class="py-2 px-3 text-center">Qty</th>
                                    <th class="py-2 px-3 text-right">Harga</th>
                                    <th class="py-2 px-3 text-right">Subtotal</th>
                                    <th class="py-2 px-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                                {#if items.length === 0}
                                    <tr>
                                        <td colspan="5" class="py-8 text-center text-slate-400">Belum ada barang ditambahkan.</td>
                                    </tr>
                                {/if}
                                {#each items as item, i}
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                        <td class="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                                            {item.name} <br>
                                            <span class="text-[10px] text-slate-400 font-normal">{item.sku}</span>
                                        </td>
                                        <td class="py-2 px-3 text-center font-mono">{item.qty}</td>
                                        <td class="py-2 px-3 text-right font-mono">{rp(item.unitPrice)}</td>
                                        <td class="py-2 px-3 text-right font-mono text-indigo-700 dark:text-indigo-400 font-bold">{rp(item.subtotal)}</td>
                                        <td class="py-2 px-3 text-center">
                                            <button type="button" on:click={() => removeItem(i)} class="p-1 text-red-500 hover:bg-red-50 rounded">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <div class="bg-indigo-600 rounded-xl shadow-sm p-6 text-white space-y-4">
                    <h2 class="font-black text-indigo-100 text-lg border-b border-indigo-500/50 pb-2">Ringkasan</h2>
                    <div class="flex justify-between items-center">
                        <span class="text-indigo-200 text-sm">Total Barang</span>
                        <span class="font-bold text-lg">{items.length} Item</span>
                    </div>
                    <div class="flex flex-col gap-1 pt-4 border-t border-indigo-500/50">
                        <span class="text-indigo-200 text-sm">Grand Total</span>
                        <span class="font-black text-3xl font-mono">{rp(grandTotal)}</span>
                    </div>

                    <!-- Hidden input to pass items JSON to server -->
                    <input type="hidden" name="itemsData" value={JSON.stringify(items)}>
                    
                    <button type="submit" disabled={items.length === 0} class="w-full mt-4 bg-white text-indigo-700 font-black py-3 rounded-lg hover:bg-indigo-50 transition shadow disabled:opacity-50 disabled:cursor-not-allowed">
                        BUAT PURCHASE ORDER
                    </button>
                </div>

                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 space-y-4">
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Catatan Tambahan</label>
                    <textarea name="notes" rows="4" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none resize-none" placeholder="Catatan opsional untuk PO ini..."></textarea>
                </div>
            </div>
        </div>
    </form>
</div>
