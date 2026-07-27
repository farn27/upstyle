<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data;
    export let form;
    const { unit, contacts, stages } = data;

    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);

    let grouped = { ...data.grouped };
    let showModal = false;
    let dragDealId = null;
    let dragFromStage = null;

    const STAGE_LABELS = { prospek:'Prospek', negosiasi:'Negosiasi', penawaran:'Penawaran', closing:'Closing', won:'Won 🏆' };
    const STAGE_COLORS = { prospek:'bg-slate-100 text-slate-700', negosiasi:'bg-blue-100 text-blue-700', penawaran:'bg-amber-100 text-amber-700', closing:'bg-indigo-100 text-indigo-700', won:'bg-emerald-100 text-emerald-700' };

    function stageTotal(stage) {
        return grouped[stage]?.reduce((s, d) => s + Number(d.nilai || 0), 0) || 0;
    }

    function dragStart(e, dealId, fromStage) {
        dragDealId = dealId;
        dragFromStage = fromStage;
        e.dataTransfer.effectAllowed = 'move';
    }

    function dragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

    async function drop(e, toStage) {
        e.preventDefault();
        if (!dragDealId || dragFromStage === toStage) return;
        // Optimistic update
        const deal = grouped[dragFromStage]?.find(d => d.id === dragDealId);
        if (deal) {
            grouped[dragFromStage] = grouped[dragFromStage].filter(d => d.id !== dragDealId);
            grouped[toStage] = [{ ...deal, stage: toStage }, ...(grouped[toStage] || [])];
            grouped = { ...grouped };
        }
        // POST to server
        const fd = new FormData();
        fd.append('deal_id', String(dragDealId));
        fd.append('stage', toStage);
        await fetch('?/updateStage', { method: 'POST', body: fd });
        dragDealId = null;
        dragFromStage = null;
    }

    $: if (form?.success) { showModal = false; }
</script>

<PageLayout title="Pipeline Penjualan" subtitle="Kelola prospek dan deal secara visual" badge="Sales" {slug} {unit}>
    <div slot="actions">
        <button on:click={() => showModal = true}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition">
            + Tambah Deal
        </button>
    </div>

    <!-- Kanban Board -->
    <div class="flex gap-4 overflow-x-auto pb-4 mt-4 min-h-[60vh]" in:fade>
        {#each stages as stage}
        <div class="flex-shrink-0 w-64 flex flex-col"
             on:dragover={dragOver}
             on:drop={(e) => drop(e, stage)}>
            <!-- Column header -->
            <div class="flex items-center justify-between mb-3 px-1">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black {STAGE_COLORS[stage]}">{STAGE_LABELS[stage]}</span>
                    <span class="text-[10px] font-bold text-slate-400">{grouped[stage]?.length || 0}</span>
                </div>
                <span class="text-[9px] font-black text-slate-500">{fmt(stageTotal(stage))}</span>
            </div>

            <!-- Cards -->
            <div class="flex flex-col gap-2 flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-2 min-h-[200px] border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                {#each grouped[stage] || [] as deal (deal.id)}
                <div
                    draggable="true"
                    on:dragstart={(e) => dragStart(e, deal.id, stage)}
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                    transition:fade={{ duration: 150 }}>
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <p class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug truncate flex-1">{deal.namaDeal}</p>
                        <form method="POST" action="?/deleteDeal" use:enhance>
                            <input type="hidden" name="deal_id" value={deal.id} />
                            <button type="submit" class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </form>
                    </div>
                    <p class="text-sm font-black text-indigo-600 dark:text-indigo-400">{fmt(deal.nilai)}</p>
                    {#if deal.contact}
                        <p class="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            {deal.contact.nama}
                        </p>
                    {/if}
                </div>
                {/each}

                {#if (grouped[stage] || []).length === 0}
                    <div class="flex-1 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider py-8">
                        Kosong
                    </div>
                {/if}
            </div>
        </div>
        {/each}
    </div>
</PageLayout>

<!-- Modal Tambah Deal -->
{#if showModal}
<div class="fixed inset-0 z-[500] bg-slate-900/60 flex items-center justify-center p-4" transition:fade={{duration:120}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <p class="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wide">Tambah Deal Baru</p>
            <button on:click={() => showModal = false} class="text-slate-400 hover:text-rose-500 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <form method="POST" action="?/createDeal" use:enhance class="p-5 space-y-4">
            <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nama Deal *</label>
                <input type="text" name="nama_deal" required placeholder="Contoh: Proyek Seragam PT ABC"
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" />
            </div>
            <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nilai (Rp)</label>
                <input type="number" name="nilai" min="0" placeholder="0"
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Stage</label>
                    <select name="stage" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        {#each stages as s}<option value={s}>{STAGE_LABELS[s]}</option>{/each}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Kontak</label>
                    <select name="kontak_id" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option value="">-- Pilih --</option>
                        {#each contacts as c}<option value={c.id}>{c.nama}</option>{/each}
                    </select>
                </div>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" on:click={() => showModal = false}
                    class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition">
                    Batal
                </button>
                <button type="submit"
                    class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
                    Simpan
                </button>
            </div>
        </form>
    </div>
</div>
{/if}
