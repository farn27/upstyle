<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import SubNav from '$lib/components/SubNav.svelte';
    import { addNotif } from '$lib/notifStore';

    export let data;
    $: ({ unit, dealsList, kontakList, companyList } = data);
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const STAGES = [
        { id: 'prospek', title: 'Prospek Awal', color: 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200' },
        { id: 'follow-up', title: 'Follow Up / Diskusi', color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { id: 'negosiasi', title: 'Negosiasi', color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { id: 'won', title: 'Closed Won', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    ];

    let isAddModalOpen = false;

    // Grouping deals
    $: columns = STAGES.map(stage => {
        return {
            ...stage,
            deals: dealsList.filter(d => {
                if (stage.id === 'won') return d.status === 'won';
                return d.stage === stage.id && d.status !== 'won' && d.status !== 'lost';
            })
        };
    });

    // Helper untuk menjumlahkan nilai pipeline per kolom
    const sumPipeline = (deals) => deals.reduce((acc, curr) => acc + Number(curr.nilai || 0), 0);

    // --- DRAG AND DROP LOGIC ---
    let draggedDealId = null;
    let isUpdating = false;

    function handleDragStart(e, dealId) {
        draggedDealId = dealId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dealId.toString());
        
        // Timeout sedikit agar elemen tetap terlihat saat didrag
        setTimeout(() => {
            e.target.classList.add('opacity-50');
        }, 0);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        draggedDealId = null;
        const cols = document.querySelectorAll('.kanban-col');
        cols.forEach(c => c.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'border-indigo-300'));
    }

    function handleDragOver(e) {
        e.preventDefault(); // Diperlukan untuk memperbolehkan drop
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e, colId) {
        e.preventDefault();
        const colEl = e.currentTarget;
        colEl.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20', 'border-indigo-300');
    }

    function handleDragLeave(e) {
        const colEl = e.currentTarget;
        colEl.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'border-indigo-300');
    }

    function handleDrop(e, colId) {
        e.preventDefault();
        const colEl = e.currentTarget;
        colEl.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'border-indigo-300');
        
        const dealId = e.dataTransfer.getData('text/plain');
        if (dealId && draggedDealId) {
            updateDealStage(dealId, colId);
        }
    }

    // Submit hidden form via JS
    let updateForm;
    let updateDealIdField;
    let updateStageField;

    function updateDealStage(dealId, newStage) {
        if (isUpdating) return;
        isUpdating = true;
        
        // Optimistic UI Update
        const dealIndex = dealsList.findIndex(d => d.id.toString() === dealId.toString());
        if (dealIndex > -1) {
            dealsList[dealIndex].stage = newStage;
            if (newStage === 'won') {
                dealsList[dealIndex].status = 'won';
            } else if (dealsList[dealIndex].status === 'won') {
                dealsList[dealIndex].status = 'open';
            }
            dealsList = [...dealsList]; // Trigger reactivity
        }

        // Submit form
        updateDealIdField.value = dealId;
        updateStageField.value = newStage;
        updateForm.requestSubmit();
    }
</script>

<div class="max-w-full overflow-x-hidden mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">CRM / Pipeline</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Sales Pipeline</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Kelola prospek dan peluang penjualan (Kanban View).</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Deal Baru
        </button>
    </div>

    <SubNav {slug} />

    <!-- Form tersembunyi untuk update stage -->
    <form method="POST" action="?/updateStage" bind:this={updateForm} class="hidden" use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success') {
                // Notifikasi toast (opsional, karena update optimistic sudah di UI)
                // addNotif('Deal berhasil diperbarui', 'success');
            } else {
                addNotif('Gagal mengupdate deal', 'error');
            }
        };
    }}>
        <input type="hidden" name="dealId" bind:this={updateDealIdField} />
        <input type="hidden" name="newStage" bind:this={updateStageField} />
    </form>

    <div class="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-250px)] min-h-[500px]">
        {#each columns as col}
            <div class="w-[320px] min-w-[320px] flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 h-full overflow-hidden">
                <!-- Header Kolom -->
                <div class="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-full {col.id === 'won' ? 'bg-emerald-500' : 'bg-indigo-500'}"></div>
                        <h3 class="font-black text-sm text-slate-800 dark:text-slate-100">{col.title}</h3>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">{col.deals.length}</span>
                </div>
                
                <!-- Total Nilai Kolom -->
                <div class="px-4 py-2 bg-slate-100 dark:bg-slate-800/80/50 border-b border-slate-200 dark:border-slate-700/50">
                    <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Potensi Nilai</p>
                    <p class="font-mono font-bold text-slate-700 dark:text-slate-200">{rp(sumPipeline(col.deals))}</p>
                </div>

                <!-- Kartu Deal -->
                <div class="flex-1 overflow-y-auto p-3 space-y-3 kanban-col transition-colors duration-200 rounded-b-xl"
                     on:dragover={handleDragOver}
                     on:dragenter={(e) => handleDragEnter(e, col.id)}
                     on:dragleave={handleDragLeave}
                     on:drop={(e) => handleDrop(e, col.id)}>
                    {#each col.deals as deal (deal.id)}
                        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition cursor-grab active:cursor-grabbing group"
                             draggable="true"
                             on:dragstart={(e) => handleDragStart(e, deal.id)}
                             on:dragend={handleDragEnd}>
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 leading-tight group-hover:text-indigo-600 transition">{deal.namaDeal}</h4>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">{deal.contact?.nama || 'Tanpa Kontak'}</p>
                            <div class="flex justify-between items-end mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                                <span class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">{deal.status}</span>
                                <span class="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">{rp(deal.nilai)}</span>
                            </div>
                        </div>
                    {/each}
                    
                    {#if col.deals.length === 0}
                        <div class="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center pointer-events-none">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-500">Tarik kartu ke sini</span>
                        </div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <!-- Modal Tambah Deal -->
    {#if isAddModalOpen}
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 transition-opacity">
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 transform transition-all">
                <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <div>
                        <h3 class="font-black text-xl text-slate-800 dark:text-white">Tambah Deal / Prospek Baru</h3>
                        <p class="text-xs text-slate-500 mt-1">Lengkapi informasi prospek untuk mulai melacak kesepakatan.</p>
                    </div>
                    <button type="button" on:click={() => isAddModalOpen = false} class="text-slate-400 hover:text-red-500 transition p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form method="POST" action="?/createDeal" use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') {
                            isAddModalOpen = false;
                            addNotif('Deal berhasil ditambahkan!', 'success');
                        } else {
                            addNotif(result.data?.message || 'Gagal menambahkan deal', 'error');
                        }
                        update();
                    };
                }} class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="col-span-full">
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Judul / Nama Deal <span class="text-red-500">*</span></label>
                            <input type="text" name="namaDeal" required class="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm" placeholder="Contoh: Implementasi Software ERP - PT ABC">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Kontak Person (Klien)</label>
                            <select name="contactId" class="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm">
                                <option value="">-- Pilih Kontak --</option>
                                {#each kontakList || [] as kontak}
                                    <option value={kontak.id}>{kontak.nama} {kontak.perusahaan ? `(${kontak.perusahaan})` : ''}</option>
                                {/each}
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Perusahaan / B2B</label>
                            <select name="companyId" class="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm">
                                <option value="">-- Pilih Perusahaan --</option>
                                {#each companyList || [] as company}
                                    <option value={company.id}>{company.namaPerusahaan}</option>
                                {/each}
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tahapan Saat Ini (Stage)</label>
                            <select name="stage" class="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm">
                                <option value="prospek">Prospek Awal</option>
                                <option value="follow-up">Follow Up / Diskusi</option>
                                <option value="negosiasi">Negosiasi</option>
                                <option value="won">Closed Won</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nilai Potensi (Rp) <span class="text-red-500">*</span></label>
                            <input type="number" name="nilai" required min="0" class="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm font-mono" placeholder="0">
                        </div>
                    </div>
                    
                    <div class="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button type="button" on:click={() => isAddModalOpen = false} class="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Batal</button>
                        <button type="submit" class="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition">Simpan Deal Baru</button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</div>
