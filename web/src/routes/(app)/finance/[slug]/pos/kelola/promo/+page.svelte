<script>
    import { enhance } from '$app/forms';
    import { fade, scale } from 'svelte/transition';
    export let data;
    export let form;
    
    let promos = data.promos || [];
    let showAddModal = false;

    function formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
    }
</script>

<div class="p-6 md:p-8 h-full flex flex-col relative">
    <header class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Kelola Promo</h1>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Buat diskon & voucher untuk pelanggan</p>
        </div>
        <button on:click={() => showAddModal = true} class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-600/30">
            + Tambah Promo
        </button>
    </header>

    {#if form?.error}
        <div class="mb-6 p-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold">
            {form.error}
        </div>
    {/if}

    <div class="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div class="overflow-auto flex-1 custom-scrollbar">
            <table class="w-full text-left">
                <thead class="bg-slate-50 sticky top-0 z-10">
                    <tr>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Kode Voucher</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Nilai Diskon</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Masa Berlaku</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Penggunaan</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Status</th>
                        <th class="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    {#each promos as promo}
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="py-4 px-6">
                                <p class="text-sm font-bold text-blue-600 uppercase tracking-widest">{promo.code}</p>
                            </td>
                            <td class="py-4 px-6">
                                <span class="text-sm font-bold text-emerald-600">
                                    {promo.discountType === 'PERCENTAGE' ? `${Number(promo.discountValue)}%` : formatRupiah(promo.discountValue)}
                                </span>
                                {#if Number(promo.minPurchase) > 0}
                                    <p class="text-[9px] text-slate-500 uppercase mt-0.5">Min. Beli: {formatRupiah(promo.minPurchase)}</p>
                                {/if}
                            </td>
                            <td class="py-4 px-6">
                                <p class="text-[11px] font-bold text-slate-700">{promo.validFrom} s/d {promo.validUntil}</p>
                            </td>
                            <td class="py-4 px-6 text-sm font-bold text-slate-500">
                                {promo.currentUsage} / {promo.maxUsage === 0 ? '∞' : promo.maxUsage}
                            </td>
                            <td class="py-4 px-6 text-center">
                                <form method="POST" action="?/toggle" use:enhance>
                                    <input type="hidden" name="id" value={promo.id} />
                                    <input type="hidden" name="isActive" value={!promo.isActive} />
                                    <button type="submit" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {promo.isActive ? 'bg-emerald-500' : 'bg-slate-200'}">
                                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {promo.isActive ? 'translate-x-6' : 'translate-x-1'} shadow-sm"></span>
                                    </button>
                                </form>
                            </td>
                            <td class="py-4 px-6 text-center">
                                <form method="POST" action="?/delete" use:enhance={() => {
                                    return async ({ update }) => {
                                        if (confirm('Hapus voucher ini?')) {
                                            await update();
                                        }
                                    };
                                }}>
                                    <input type="hidden" name="id" value={promo.id} />
                                    <button type="submit" class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td colspan="6" class="py-12 text-center text-slate-400 font-medium">Belum ada promo yang dibuat</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>

{#if showAddModal}
    <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative" in:scale={{duration: 200, start:0.95}}>
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Tambah Promo Baru</h2>
            <form method="POST" action="?/create" use:enhance={() => {
                return async ({ update, result }) => {
                    await update();
                    if (result.type === 'success') showAddModal = false;
                };
            }}>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kode Voucher</label>
                        <input type="text" name="code" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 uppercase font-bold text-blue-600"/>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tipe Diskon</label>
                            <select name="discountType" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 font-bold">
                                <option value="PERCENTAGE">Persentase (%)</option>
                                <option value="FIXED">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nilai Diskon</label>
                            <input type="number" name="discountValue" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 font-bold"/>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Berlaku Mulai</label>
                            <input type="date" name="validFrom" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 font-bold"/>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Berlaku Sampai</label>
                            <input type="date" name="validUntil" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 font-bold"/>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Maks. Kuota (0=Unlimited)</label>
                            <input type="number" name="maxUsage" value="0" min="0" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 font-bold"/>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min. Pembelian (Rp)</label>
                            <input type="number" name="minPurchase" value="0" min="0" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 font-bold"/>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3 mt-8">
                    <button type="button" on:click={() => showAddModal = false} class="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase text-[10px]">Batal</button>
                    <button type="submit" class="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors uppercase text-[10px] shadow-lg shadow-blue-600/30">Simpan Promo</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
</style>
