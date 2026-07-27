<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit, quotationList, contactList, productList } = data;
    let showModal = false;
    let items = [{ product_id: '', product_name: '', qty: 1, price: 0, total: 0 }];
    $: grandTotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);
    $: if (form?.success) { showModal = false; items = [{ product_id:'', product_name:'', qty:1, price:0, total:0 }]; }

    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);

    const STATUS_COLOR = {
        DRAFT: 'bg-slate-100 text-slate-600', SENT: 'bg-blue-100 text-blue-700',
        ACCEPTED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-rose-100 text-rose-700',
        EXPIRED: 'bg-amber-100 text-amber-700'
    };

    function selectProduct(idx, pid) {
        const p = productList.find(x => String(x.id) === String(pid));
        if (p) {
            items[idx].product_id = p.id;
            items[idx].product_name = p.nama;
            items[idx].price = Number(p.hargaJual);
            items[idx].total = items[idx].qty * items[idx].price;
            items = [...items];
        }
    }
    function updateQty(idx, v) {
        items[idx].qty = Number(v);
        items[idx].total = items[idx].qty * items[idx].price;
        items = [...items];
    }
    function addItem() { items = [...items, { product_id:'', product_name:'', qty:1, price:0, total:0 }]; }
    function removeItem(idx) { if (items.length > 1) items = items.filter((_,i) => i !== idx); }
</script>

<PageLayout title="Penawaran Harga" subtitle="Buat dan kelola quotation ke pelanggan" badge="Sales" slug={unit.slug} {unit}>
    <div slot="actions">
        <button on:click={() => showModal = true}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            + Buat Penawaran
        </button>
    </div>

    <div class="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-5 py-3">Nomor</th><th class="px-5 py-3">Pelanggan</th>
                    <th class="px-5 py-3 text-right">Total</th><th class="px-5 py-3 text-center">Berlaku s/d</th>
                    <th class="px-5 py-3 text-center">Status</th><th class="px-5 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each quotationList as q}
                <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="px-5 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{q.quotationNumber}</td>
                    <td class="px-5 py-3 text-slate-600 dark:text-slate-400">{q.customer?.nama || '—'}</td>
                    <td class="px-5 py-3 text-right font-black text-slate-800 dark:text-white">{fmt(q.totalAmount)}</td>
                    <td class="px-5 py-3 text-center text-slate-500">{q.validUntil}</td>
                    <td class="px-5 py-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {STATUS_COLOR[q.status] || ''}">{q.status}</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                        <div class="flex items-center justify-center gap-1">
                            {#if q.status === 'DRAFT'}
                            <form method="POST" action="?/updateStatus" use:enhance>
                                <input type="hidden" name="quotation_id" value={q.id} /><input type="hidden" name="status" value="SENT" />
                                <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">Kirim</button>
                            </form>
                            {/if}
                            {#if q.status === 'SENT'}
                            <form method="POST" action="?/updateStatus" use:enhance>
                                <input type="hidden" name="quotation_id" value={q.id} /><input type="hidden" name="status" value="ACCEPTED" />
                                <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition">Terima</button>
                            </form>
                            <form method="POST" action="?/updateStatus" use:enhance>
                                <input type="hidden" name="quotation_id" value={q.id} /><input type="hidden" name="status" value="REJECTED" />
                                <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition">Tolak</button>
                            </form>
                            {/if}
                        </div>
                    </td>
                </tr>
                {:else}
                <tr><td colspan="6" class="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada penawaran</td></tr>
                {/each}
            </tbody>
        </table>
    </div>
</PageLayout>

<!-- Modal Buat Penawaran -->
{#if showModal}
<div class="fixed inset-0 z-[500] bg-slate-900/70 flex items-start justify-center p-4 pt-16 overflow-y-auto" transition:fade={{duration:120}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
            <p class="font-black text-sm text-slate-800 dark:text-white uppercase">Buat Penawaran Baru</p>
            <button on:click={() => showModal = false} class="text-slate-400 hover:text-rose-500">✕</button>
        </div>
        <form method="POST" action="?/create" use:enhance class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Pelanggan</label>
                    <select name="customer_id" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option value="">-- Pilih Pelanggan --</option>
                        {#each contactList as c}<option value={c.id}>{c.nama}</option>{/each}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Berlaku Sampai *</label>
                    <input type="date" name="valid_until" required
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
            </div>

            <!-- Items -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Item Produk</label>
                    <button type="button" on:click={addItem}
                        class="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase px-2 py-1 bg-indigo-50 rounded-lg transition">+ Tambah Baris</button>
                </div>
                <div class="space-y-2">
                    {#each items as item, idx}
                    <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                        <select on:change={(e) => selectProduct(idx, e.target.value)}
                            class="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none">
                            <option value="">-- Pilih Produk --</option>
                            {#each productList as p}<option value={p.id}>{p.nama} (Rp{Number(p.hargaJual).toLocaleString('id-ID')})</option>{/each}
                        </select>
                        <input type="number" min="1" value={item.qty}
                            on:input={(e) => updateQty(idx, e.target.value)}
                            placeholder="Qty"
                            class="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center outline-none" />
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">{fmt(item.qty * item.price)}</span>
                        <button type="button" on:click={() => removeItem(idx)} class="text-slate-300 hover:text-rose-500 transition">✕</button>
                    </div>
                    {/each}
                </div>
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
                    <span class="text-xs font-black text-slate-600 dark:text-slate-300">Total: </span>
                    <span class="text-sm font-black text-indigo-600">{fmt(grandTotal)}</span>
                </div>
            </div>

            <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Catatan</label>
                <textarea name="notes" rows="2"
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none"></textarea>
            </div>

            <input type="hidden" name="items_json" value={JSON.stringify(items.map(i => ({ ...i, product_name: i.product_name || 'Item' })))} />

            <div class="flex gap-3 pt-2">
                <button type="button" on:click={() => showModal = false}
                    class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-black uppercase">Batal</button>
                <button type="submit"
                    class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md">Simpan</button>
            </div>
        </form>
    </div>
</div>
{/if}
