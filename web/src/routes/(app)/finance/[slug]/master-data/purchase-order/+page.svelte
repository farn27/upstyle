<script>
    import { page } from '$app/stores';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import SubNav from '$lib/components/SubNav.svelte';
    
    export let data;
    const { pos } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    function getStatusBadge(status) {
        switch(status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-700';
            case 'SENT': return 'bg-blue-100 text-blue-700';
            case 'PARTIAL': return 'bg-amber-100 text-amber-700';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    }
</script>

<PageLayout title="Purchase Orders" subtitle="Manajemen pembelian dan penerimaan stok dari supplier">
    <svelte:fragment slot="actions">
        <SubNav {slug} />
        <a href={`/finance/${slug}/master-data/purchase-order/new`} class="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            + Buat PO Baru
        </a>
    </svelte:fragment>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">No. PO</th>
                        <th class="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Tanggal</th>
                        <th class="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Supplier</th>
                        <th class="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Total Nominal</th>
                        <th class="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-200">
                    {#each pos as po}
                        <tr class="hover:bg-slate-50 transition">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{po.poNumber}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(po.createdAt).toLocaleDateString('id-ID')}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{po.supplierName || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{rp(po.totalAmount)}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadge(po.status)}`}>
                                    {po.status}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <a href={`/finance/${slug}/master-data/purchase-order/${po.id}`} class="text-indigo-600 hover:text-indigo-900 font-bold">Terima Barang &rarr;</a>
                            </td>
                        </tr>
                    {/each}
                    {#if pos.length === 0}
                        <tr>
                            <td colspan="6" class="px-6 py-12 text-center text-slate-500 text-sm">Belum ada data Purchase Order.</td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</PageLayout>
