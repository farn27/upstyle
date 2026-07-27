<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit, voucherList } = data;
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);
    let showModal = false;
    let autoCode = 'PROMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    $: if (form?.success) showModal = false;
    function regen() { autoCode = 'PROMO-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
</script>

<PageLayout title="Voucher & Diskon" subtitle="Buat dan kelola kode promo" badge="Marketing" slug={unit.slug} {unit}>
    <div slot="actions">
        <button on:click={() => showModal = true}
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            + Buat Voucher
        </button>
    </div>

    <div class="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-5 py-3">Kode</th><th class="px-5 py-3 text-center">Tipe</th>
                    <th class="px-5 py-3 text-center">Nilai</th><th class="px-5 py-3 text-center">Pemakaian</th>
                    <th class="px-5 py-3 text-center">Berlaku</th><th class="px-5 py-3 text-center">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each voucherList as v}
                <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td class="px-5 py-3 font-mono font-black text-slate-800 dark:text-white tracking-wider">{v.code}</td>
                    <td class="px-5 py-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black {v.discountType === 'PERCENTAGE' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}">{v.discountType}</span>
                    </td>
                    <td class="px-5 py-3 text-center font-black text-indigo-600">
                        {v.discountType === 'PERCENTAGE' ? Number(v.discountValue) + '%' : fmt(v.discountValue)}
                    </td>
                    <td class="px-5 py-3 text-center text-slate-500">
                        {Number(v.currentUsage)}/{Number(v.maxUsage) === 0 ? '∞' : Number(v.maxUsage)}
                    </td>
                    <td class="px-5 py-3 text-center text-[10px] text-slate-400">
                        {v.validFrom} → {v.validUntil}
                    </td>
                    <td class="px-5 py-3 text-center">
                        <form method="POST" action="?/toggle" use:enhance>
                            <input type="hidden" name="id" value={v.id} />
                            <button type="submit"
                                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                                {v.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}">
                                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                                    {v.isActive ? 'translate-x-4.5' : 'translate-x-0.5'}"></span>
                            </button>
                        </form>
                    </td>
                </tr>
                {:else}
                <tr><td colspan="6" class="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada voucher</td></tr>
                {/each}
            </tbody>
        </table>
    </div>
</PageLayout>

{#if showModal}
<div class="fixed inset-0 z-[500] bg-slate-900/70 flex items-center justify-center p-4" transition:fade={{duration:120}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
            <p class="font-black text-sm uppercase">Buat Voucher Baru</p>
            <button on:click={() => showModal = false} class="text-slate-400 hover:text-rose-500">✕</button>
        </div>
        <form method="POST" action="?/create" use:enhance class="p-5 space-y-4">
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Kode Voucher *</label>
                <div class="flex gap-2">
                    <input type="text" name="code" bind:value={autoCode} required
                        class="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none uppercase" />
                    <button type="button" on:click={regen}
                        class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl text-[10px] font-black transition">↺ Generate</button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Tipe Diskon</label>
                    <select name="discount_type" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option value="PERCENTAGE">Persentase (%)</option>
                        <option value="FIXED">Nominal (Rp)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Nilai Diskon *</label>
                    <input type="number" name="discount_value" min="0" required placeholder="0"
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Maks Pemakaian (0=∞)</label>
                    <input type="number" name="max_usage" min="0" value="0"
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Min Pembelian (Rp)</label>
                    <input type="number" name="min_purchase" min="0" value="0"
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Berlaku Dari</label>
                    <input type="date" name="valid_from" required
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Berlaku Sampai</label>
                    <input type="date" name="valid_until" required
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
            </div>
            {#if form?.error}<p class="text-[10px] text-rose-600 font-bold">{form.error}</p>{/if}
            <div class="flex gap-3 pt-1">
                <button type="button" on:click={() => showModal = false}
                    class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-black uppercase">Batal</button>
                <button type="submit"
                    class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-md">Simpan</button>
            </div>
        </form>
    </div>
</div>
{/if}
