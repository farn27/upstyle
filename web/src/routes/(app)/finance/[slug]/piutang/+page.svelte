<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    const { unit, invoices, contacts } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    let isAddModalOpen = false;
    let paymentModalData = null;
    let paymentSectionEl;

    onMount(() => {
        if ($page.url.searchParams.get('focus') === 'payment' && paymentSectionEl) {
            paymentSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
</script>

<div class="max-w-6xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Keuangan Pusat / Piutang Usaha</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Tagihan Penjualan (Piutang)</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Kelola tagihan pelanggan yang belum dibayar lunas (Account Receivables).</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition shadow flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Buat Invoice Baru
        </button>
    </div>

    <SubNav {slug} />

    {#if $page.url.searchParams.get('focus') === 'payment'}
        <div class="rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200">
            Pilih invoice di bawah, lalu klik <strong>Terima Dana</strong> untuk mencatat penerimaan pembayaran.
        </div>
    {/if}

    <!-- Invoices List -->
    <div bind:this={paymentSectionEl} class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden {$page.url.searchParams.get('focus') === 'payment' ? 'ring-2 ring-indigo-300' : ''}">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    <tr>
                        <th class="py-3 px-4">No. Invoice</th>
                        <th class="py-3 px-4">Pelanggan</th>
                        <th class="py-3 px-4">Jatuh Tempo</th>
                        <th class="py-3 px-4 text-right">Total Tagihan</th>
                        <th class="py-3 px-4 text-right">Sisa Tagihan</th>
                        <th class="py-3 px-4 text-center">Status</th>
                        <th class="py-3 px-4 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    {#if invoices.length === 0}
                        <tr>
                            <td colspan="7" class="py-8 text-center text-slate-400 dark:text-slate-500">Belum ada tagihan piutang aktif.</td>
                        </tr>
                    {/if}
                    {#each invoices as inv}
                        {@const sisa = Number(inv.nominal) - Number(inv.sudahDibayar)}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
                            <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{inv.nomorInvoice}</td>
                            <td class="py-3 px-4 text-slate-600 dark:text-slate-300">{inv.contact?.namaKontak || 'Unknown'}</td>
                            <td class="py-3 px-4 text-slate-600 dark:text-slate-300">
                                {new Date(inv.jatuhTempo).toLocaleDateString('id-ID')}
                                {#if new Date(inv.jatuhTempo) < new Date() && inv.status !== 'LUNAS'}
                                    <span class="block text-[10px] text-red-500 font-bold mt-0.5">OVERDUE</span>
                                {/if}
                            </td>
                            <td class="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400 dark:text-slate-500">{rp(inv.nominal)}</td>
                            <td class="py-3 px-4 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">{rp(sisa)}</td>
                            <td class="py-3 px-4 text-center">
                                {#if inv.status === 'LUNAS'}
                                    <span class="px-2 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">LUNAS</span>
                                {:else if inv.status === 'SEBAGIAN'}
                                    <span class="px-2 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">SEBAGIAN</span>
                                {:else}
                                    <span class="px-2 py-1 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">BELUM BAYAR</span>
                                {/if}
                            </td>
                            <td class="py-3 px-4 text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <a href="/finance/{slug}/piutang/invoice/{inv.id}" target="_blank" class="text-[10px] bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 transition">
                                        Cetak PDF
                                    </a>
                                    {#if inv.status !== 'LUNAS'}
                                        <button on:click={() => paymentModalData = { id: inv.id, nomorInvoice: inv.nomorInvoice, sisaBayar: sisa }} class="text-[10px] bg-slate-900 text-white font-bold px-3 py-1.5 rounded hover:bg-slate-800 transition">
                                            Terima Dana
                                        </button>
                                    {/if}
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Tambah Tagihan Baru -->
{#if isAddModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Buat Invoice Piutang</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/addInvoice" method="POST" use:enhance={() => { return async ({result, update}) => { if (result.type === 'success') { isAddModalOpen = false; } await update(); } }} class="flex flex-col flex-1 overflow-hidden">
                <div class="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Pilih Pelanggan / Kontak <span class="text-red-500">*</span></label>
                        <select name="contactId" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="">-- Pilih Kontak --</option>
                            {#each contacts as c}
                                <option value={c.id}>{c.namaKontak} - {c.tipeKontak}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal Invoice <span class="text-red-500">*</span></label>
                            <input type="date" name="tanggal" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Jatuh Tempo <span class="text-red-500">*</span></label>
                            <input type="date" name="jatuhTempo" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Total Nominal Tagihan (Rp) <span class="text-red-500">*</span></label>
                        <input type="number" name="nominal" required min="1" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Keterangan Tagihan</label>
                        <textarea name="keterangan" rows="2" placeholder="Contoh: Tagihan proyek pembuatan website termin 1" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"></textarea>
                    </div>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isAddModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Buat Invoice</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Terima Pembayaran -->
{#if paymentModalData}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Terima Dana Invoice</h3>
                <button on:click={() => paymentModalData = null} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/payInvoice" method="POST" use:enhance={() => { return async ({result, update}) => { if (result.type === 'success') { paymentModalData = null; } await update(); } }} class="p-6 space-y-4">
                <input type="hidden" name="invoiceId" value={paymentModalData.id}>
                
                <div class="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-lg text-center">
                    <p class="text-[10px] uppercase font-bold text-indigo-500 mb-1">Invoice: {paymentModalData.nomorInvoice}</p>
                    <p class="text-2xl font-mono font-black text-indigo-700 dark:text-indigo-300">{rp(paymentModalData.sisaBayar)}</p>
                    <p class="text-[10px] text-indigo-600">Sisa tagihan yang belum dibayar</p>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nominal Diterima (Rp) <span class="text-red-500">*</span></label>
                    <input type="number" name="nominalBayar" required min="1" max={paymentModalData.sisaBayar} value={paymentModalData.sisaBayar} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500 outline-none">
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Anda bisa mengubah nominal ini jika pembayaran dicicil (termin).</p>
                </div>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <button type="button" on:click={() => paymentModalData = null} class="flex-1 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg transition">Batal</button>
                    <button type="submit" class="flex-1 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg shadow hover:bg-slate-800 transition">Konfirmasi</button>
                </div>
            </form>
        </div>
    </div>
{/if}
