<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { addNotif } from '$lib/notifStore';

    export let data;
    const { po, items } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    let isSubmitting = false;
</script>

<PageLayout title={`Detail PO: ${po.poNumber}`} subtitle="Terima barang dan sesuaikan stok gudang">
    <svelte:fragment slot="actions">
        <a href={`/finance/${slug}/master-data/purchase-order`} class="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-bold rounded-lg shadow-sm text-slate-700 bg-white hover:bg-slate-50">
            &larr; Kembali
        </a>
    </svelte:fragment>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 mb-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
                <p class="text-xs text-slate-500 uppercase font-black tracking-wider mb-1">Status PO</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                    {po.status}
                </span>
            </div>
            <div>
                <p class="text-xs text-slate-500 uppercase font-black tracking-wider mb-1">Total Nilai</p>
                <p class="font-bold text-slate-900">{rp(po.totalAmount)}</p>
            </div>
            <div>
                <p class="text-xs text-slate-500 uppercase font-black tracking-wider mb-1">Tanggal Buat</p>
                <p class="font-bold text-slate-900">{new Date(po.createdAt).toLocaleDateString('id-ID')}</p>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form method="POST" action="?/receiveItems" class="p-0" use:enhance={() => {
            isSubmitting = true;
            return async ({ result, update }) => {
                isSubmitting = false;
                if (result.type === 'success') {
                    addNotif('Penerimaan barang berhasil disimpan!', 'success');
                } else if (result.type === 'failure') {
                    addNotif(result.data?.message || 'Gagal menyimpan', 'error');
                }
                update();
            };
        }}>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase">Produk</th>
                            <th class="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase">Harga Satuan</th>
                            <th class="px-6 py-3 text-center text-xs font-black text-slate-500 uppercase">Qty Dipesan</th>
                            <th class="px-6 py-3 text-center text-xs font-black text-slate-500 uppercase">Telah Diterima</th>
                            <th class="px-6 py-3 text-center text-xs font-black text-indigo-600 uppercase">Terima Sekarang</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                        {#each items as item}
                            <tr class="hover:bg-slate-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{item.productName || item.productId}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-700">{rp(item.unitPrice)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-slate-900">{item.qtyOrdered}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-500">{item.qtyReceived}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-center">
                                    {#if item.qtyReceived >= item.qtyOrdered}
                                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">LENGKAP</span>
                                    {:else}
                                        <input type="number" 
                                               name={`received_${item.id}`} 
                                               min="0" 
                                               max={item.qtyOrdered - item.qtyReceived} 
                                               placeholder="0"
                                               class="w-24 text-center rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-bold text-indigo-700 bg-indigo-50/50">
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            
            {#if po.status !== 'COMPLETED' && po.status !== 'CANCELLED'}
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button type="submit" disabled={isSubmitting} class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Penerimaan'}
                </button>
            </div>
            {/if}
        </form>
    </div>
</PageLayout>
