<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { fade, slide, scale } from 'svelte/transition';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    export let form;

    $: coaList = data.coaList || [];
    $: slug = $page.params.slug;
    $: unit = data.unit || {};

    let search = '';
    let filterType = 'semua';

    const accountTypes = {
        'ASET_LANCAR': { label: 'Aset Lancar', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        'ASET_TETAP': { label: 'Aset Tetap', color: 'bg-teal-50 text-teal-700 border-teal-100' },
        'LIABILITAS_LANCAR': { label: 'Liabilitas Lancar', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        'LIABILITAS_JANGKA_PANJANG': { label: 'Liabilitas Jk. Panjang', color: 'bg-orange-50 text-orange-700 border-orange-100' },
        'EKUITAS': { label: 'Ekuitas', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        'PENDAPATAN': { label: 'Pendapatan', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50' },
        'HPP': { label: 'Harga Pokok Penjualan (HPP)', color: 'bg-violet-50 text-violet-700 border-violet-100' },
        'BEBAN_OPERASIONAL': { label: 'Beban Operasional', color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 border-rose-100' },
        'BEBAN_LAINNYA': { label: 'Beban Lain-Lain', color: 'bg-red-50 text-red-700 border-red-100' },
        'PENDAPATAN_LAINNYA': { label: 'Pendapatan Lain-Lain', color: 'bg-sky-50 text-sky-700 border-sky-100' }
    };

    $: filteredCoa = coaList.filter(item => {
        const matchSearch = !search || 
            item.kodeAkun.toLowerCase().includes(search.toLowerCase()) || 
            item.namaAkun.toLowerCase().includes(search.toLowerCase()) ||
            (item.deskripsi || '').toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'semua' || item.tipeAkun === filterType;
        return matchSearch && matchType;
    });

    let isAddModalOpen = false;
    let isEditModalOpen = false;
    let isSeedModalOpen = false;
    let isGeneratingAi = false;
    let aiPrompt = '';
    let selectedCoa = null;

    const businessTypes = [
        { value: 'GROSIR', label: 'Perdagangan / Grosir' },
        { value: 'MINIMARKET', label: 'Ritel / Minimarket' },
        { value: 'BUTIK', label: 'Butik / Toko Pakaian' },
        { value: 'RESTORAN', label: 'Restoran / Rumah Makan' },
        { value: 'CAFE', label: 'Cafe / Kedai Kopi' },
        { value: 'KATERING', label: 'Katering / Produksi Makanan' },
        { value: 'BENGKEL', label: 'Bengkel / Otomotif' },
        { value: 'SALON', label: 'Salon / Barbershop / Spa' },
        { value: 'LAUNDRY', label: 'Laundry / Dry Clean' },
        { value: 'EVENT', label: 'Event Organizer / Wedding' },
        { value: 'KLINIK', label: 'Klinik / Apotek / Kesehatan' },
        { value: 'SOFTWARE', label: 'Software House / IT' },
        { value: 'SAAS', label: 'SaaS / Startup Teknologi' },
        { value: 'KONSTRUKSI', label: 'Konstruksi / Kontraktor' },
        { value: 'AGRIBISNIS', label: 'Agribisnis / Pertanian' },
        { value: 'PROPERTI', label: 'Agen Properti / Real Estate' },
        { value: 'LOGISTIK', label: 'Jasa Transportasi / Logistik' },
        { value: 'PABRIK', label: 'Pabrik / Manufaktur Umum' },
        { value: 'KOS', label: 'Kos-kosan / Properti Sewa' },
        { value: 'YAYASAN', label: 'Yayasan / Nirlaba' },
        { value: 'KONSULTAN', label: 'Jasa Konsultan / Hukum' },
        { value: 'GYM', label: 'Pusat Kebugaran / Gym' },
        { value: 'LAINNYA', label: 'Lainnya / Umum' }
    ];

    function getDefaultTemplate(kategori) {
        if (!kategori) return 'GROSIR';
        const kat = String(kategori).toUpperCase();
        
        if (kat.includes('PHARMACY') || kat.includes('CLINIC') || kat.includes('DENTAL') || kat.includes('MEDICAL')) return 'KLINIK';
        if (kat.includes('FASHION') || kat.includes('BUTIK')) return 'BUTIK';
        if (kat.includes('RESTO') || kat === 'F&B') return 'RESTORAN';
        if (kat.includes('COFFEE') || kat.includes('CAFE')) return 'CAFE';
        if (kat.includes('CATERING')) return 'KATERING';
        if (kat.includes('BEAUTY') || kat.includes('SALON') || kat.includes('BARBER')) return 'SALON';
        if (kat.includes('LAUNDRY')) return 'LAUNDRY';
        if (kat.includes('WORKSHOP') || kat.includes('BENGKEL') || kat.includes('OTOMOTIF')) return 'BENGKEL';
        if (kat.includes('EVENT') || kat.includes('PHOTOGRAPHY')) return 'EVENT';
        if (kat.includes('SOFTWARE') || kat.includes('CYBER')) return 'SOFTWARE';
        if (kat.includes('SAAS') || kat.includes('DATA_CENTER')) return 'SAAS';
        if (kat.includes('CONSTRUCTION') || kat.includes('ARCHITECT') || kat.includes('KONSTRUKSI')) return 'KONSTRUKSI';
        if (kat.includes('MINING') || kat.includes('AGRI') || kat.includes('PERTANIAN')) return 'AGRIBISNIS';
        if (kat.includes('PROPERTY') || kat.includes('ESTATE') || kat.includes('PROPERTI')) return 'PROPERTI';
        if (kat.includes('LOGISTIC') || kat.includes('SHIPPING') || kat.includes('FREIGHT')) return 'LOGISTIK';
        if (kat.includes('MANUFAKTUR') || kat.includes('PABRIK') || kat === 'ENTERPRISE') return 'PABRIK';
        if (kat.includes('KOS') || kat.includes('RENTAL')) return 'KOS';
        if (kat.includes('GOV') || kat.includes('NONPROFIT') || kat.includes('RELIGIOUS') || kat.includes('YAYASAN')) return 'YAYASAN';
        if (kat.includes('CONSULT') || kat.includes('JASA') || kat.includes('KONSULTAN')) return 'KONSULTAN';
        if (kat.includes('GYM') || kat.includes('FITNESS')) return 'GYM';
        if (kat.includes('MINIMARKET') || kat === 'RETAIL') return 'MINIMARKET';
        if (kat.includes('DISTRIBUTOR') || kat.includes('GROSIR')) return 'GROSIR';
        
        return 'LAINNYA'; // Default fallback 
    }

    let selectedTemplate = 'GROSIR';
    $: {
        if (unit?.kategori && !isSeedModalOpen) {
            selectedTemplate = getDefaultTemplate(unit.kategori);
        }
    }

    let formBody = {
        id: '',
        kodeAkun: '',
        namaAkun: '',
        tipeAkun: 'ASET_LANCAR',
        normalBalance: 'DEBIT',
        deskripsi: '',
        parentId: '',
        isActive: true
    };

    function openAddModal() {
        formBody = { id: '', kodeAkun: '', namaAkun: '', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: '', parentId: '', isActive: true };
        isAddModalOpen = true;
    }

    function openEditModal(item) {
        selectedCoa = item;
        formBody = { ...item, isActive: item.isActive === 1, parentId: item.parentId || '' };
        isEditModalOpen = true;
    }

    // Auto balance suggestions based on type
    $: {
        if (formBody.tipeAkun) {
            const t = formBody.tipeAkun;
            if (t.startsWith('ASET') || t === 'HPP' || t.startsWith('BEBAN')) {
                formBody.normalBalance = 'DEBIT';
            } else {
                formBody.normalBalance = 'KREDIT';
            }
        }
    }
</script>

<svelte:head>
    <title>Chart of Accounts — {unit.namaUnit || slug}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
                <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Master Data / Akun (COA)</p>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white leading-tight">Bagan Akun (Chart of Accounts)</h1>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kelola bagan perkiraan jurnal akuntansi unit {unit.namaUnit || slug}</p>
            </div>

            <div class="flex items-center gap-2">
                {#if coaList.length === 0}
                    <button type="button" on:click={() => isSeedModalOpen = true} class="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition">
                        ⚡ Buat COA Standard
                    </button>
                {/if}
                <button on:click={openAddModal} class="text-xs bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition">
                    + Tambah Akun Baru
                </button>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <SubNav {slug} />
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <!-- Notification feedback -->
        {#if form?.message}
            <div in:fade class="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-between">
                <span>{form.message}</span>
            </div>
        {/if}

        <!-- Search / Filter bar -->
        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex gap-3 flex-wrap items-center shadow-sm">
            <div class="relative flex-1 min-w-[200px]">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input bind:value={search} placeholder="Cari kode, nama, atau deskripsi..." class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
            </div>

            <select bind:value={filterType} class="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                <option value="semua">Semua Tipe Akun</option>
                {#each Object.entries(accountTypes) as [key, val]}
                    <option value={key}>{val.label}</option>
                {/each}
            </select>

            <span class="text-xs font-bold text-slate-400 dark:text-slate-500">{filteredCoa.length} akun ditemukan</span>
        </div>

        <!-- Table -->
        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
                <table class="min-w-full text-xs text-left">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th class="px-6 py-3">Kode Akun</th>
                            <th class="px-6 py-3">Nama Akun</th>
                            <th class="px-6 py-3">Kategori / Tipe</th>
                            <th class="px-6 py-3">Normal Balance</th>
                            <th class="px-6 py-3">Deskripsi</th>
                            <th class="px-6 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        {#if filteredCoa.length === 0}
                            <tr>
                                <td colspan="6" class="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                    {#if coaList.length === 0}
                                        Belum ada bagan akun. Klik "Buat COA Standard" di kanan atas untuk memulai secara otomatis.
                                    {:else}
                                        Tidak ada akun yang cocok dengan filter pencarian.
                                    {/if}
                                </td>
                            </tr>
                        {:else}
                            {#each filteredCoa as item (item.id)}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition">
                                    <td class="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{item.kodeAkun}</td>
                                    <td class="px-6 py-4 font-black text-slate-800 dark:text-slate-100 text-sm">{item.namaAkun}</td>
                                    <td class="px-6 py-4">
                                        <div class="flex flex-col gap-1 items-start">
                                            <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border {accountTypes[item.tipeAkun]?.color || 'bg-slate-100 dark:bg-slate-800/80'}">
                                                {accountTypes[item.tipeAkun]?.label || item.tipeAkun}
                                            </span>
                                            {#if item.isActive === 0}
                                                <span class="px-2 py-0.5 rounded text-[8px] font-bold bg-rose-100 text-rose-700">NONAKTIF</span>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="font-bold {item.normalBalance === 'DEBIT' ? 'text-indigo-600' : 'text-amber-600'}">
                                            {item.normalBalance}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-slate-400 dark:text-slate-500 max-w-xs truncate" title={item.deskripsi}>{item.deskripsi || '—'}</td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="inline-flex gap-2">
                                            <button on:click={() => openEditModal(item)} class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 font-black">Edit</button>
                                            <form method="POST" action="?/deleteCoa" use:enhance>
                                                <input type="hidden" name="id" value={item.id} />
                                                <button type="submit" class="text-rose-500 hover:text-rose-700 font-black">Hapus</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Add Modal -->
{#if isAddModalOpen}
    <div in:fade="{{ duration: 150 }}" class="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
        <div in:scale="{{ start: 0.95, duration: 150 }}" class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 class="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Tambah Bagan Akun (COA)</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">✕</button>
            </div>
            <form method="POST" action="?/addCoa" use:enhance={() => { isAddModalOpen = false; }} class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Kode Akun</label>
                        <input name="kodeAkun" placeholder="1-1001" required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Nama Akun</label>
                        <input name="namaAkun" placeholder="Kas Kecil" required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tipe Akun</label>
                        <select name="tipeAkun" bind:value={formBody.tipeAkun} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            {#each Object.entries(accountTypes) as [key, val]}
                                <option value={key}>{val.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Saldo Normal</label>
                        <select name="normalBalance" bind:value={formBody.normalBalance} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            <option value="DEBIT">DEBIT</option>
                            <option value="KREDIT">KREDIT</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Sub-Akun Dari (Opsional)</label>
                        <select name="parentId" bind:value={formBody.parentId} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <option value="">-- Bukan Sub Akun --</option>
                            {#each coaList as p}
                                <option value={p.id}>[{p.kodeAkun}] {p.namaAkun}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Deskripsi Akun</label>
                        <textarea name="deskripsi" placeholder="Tulis catatan..." rows="1" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition"></textarea>
                    </div>
                </div>

                <label class="flex items-center gap-2 mt-2">
                    <input type="checkbox" name="isActive" bind:checked={formBody.isActive} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Akun Aktif dan dapat digunakan di jurnal</span>
                </label>

                <div class="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-2">
                    <button type="button" on:click={() => isAddModalOpen = false} class="text-xs font-bold text-slate-400 dark:text-slate-500 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">Batal</button>
                    <button type="submit" class="text-xs font-black uppercase bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">Simpan Akun</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit Modal -->
{#if isEditModalOpen}
    <div in:fade="{{ duration: 150 }}" class="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
        <div in:scale="{{ start: 0.95, duration: 150 }}" class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 class="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Edit Bagan Akun</h3>
                <button on:click={() => isEditModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">✕</button>
            </div>
            <form method="POST" action="?/editCoa" use:enhance={() => { isEditModalOpen = false; }} class="p-6 space-y-4">
                <input type="hidden" name="id" value={formBody.id} />
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Kode Akun</label>
                        <input name="kodeAkun" bind:value={formBody.kodeAkun} required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Nama Akun</label>
                        <input name="namaAkun" bind:value={formBody.namaAkun} required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tipe Akun</label>
                        <select name="tipeAkun" bind:value={formBody.tipeAkun} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            {#each Object.entries(accountTypes) as [key, val]}
                                <option value={key}>{val.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Saldo Normal</label>
                        <select name="normalBalance" bind:value={formBody.normalBalance} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            <option value="DEBIT">DEBIT</option>
                            <option value="KREDIT">KREDIT</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Sub-Akun Dari (Opsional)</label>
                        <select name="parentId" bind:value={formBody.parentId} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <option value="">-- Bukan Sub Akun --</option>
                            {#each coaList as p}
                                {#if p.id !== formBody.id}
                                    <option value={p.id}>[{p.kodeAkun}] {p.namaAkun}</option>
                                {/if}
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Deskripsi Akun</label>
                        <textarea name="deskripsi" bind:value={formBody.deskripsi} rows="1" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition"></textarea>
                    </div>
                </div>

                <label class="flex items-center gap-2 mt-2">
                    <input type="checkbox" name="isActive" bind:checked={formBody.isActive} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Akun Aktif dan dapat digunakan di jurnal</span>
                </label>

                <div class="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-2">
                    <button type="button" on:click={() => isEditModalOpen = false} class="text-xs font-bold text-slate-400 dark:text-slate-500 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">Batal</button>
                    <button type="submit" class="text-xs font-black uppercase bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Seed Modal -->
{#if isSeedModalOpen}
    <div in:fade="{{ duration: 150 }}" class="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
        <div in:scale="{{ start: 0.95, duration: 150 }}" class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-5xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 class="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Buat COA Standard</h3>
                <button on:click={() => isSeedModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">✕</button>
            </div>
            
            <form method="POST" use:enhance={({ action }) => { 
                if (action.search.includes('generateAiCoa')) {
                    isGeneratingAi = true;
                }
                return async ({ result, update }) => {
                    isGeneratingAi = false;
                    if(result.type === 'success') isSeedModalOpen = false;
                    await update();
                };
            }} class="flex flex-col overflow-hidden relative">

                {#if isGeneratingAi}
                    <div class="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p class="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300 animate-pulse">AI sedang meracik Chart of Accounts...</p>
                    </div>
                {/if}

                <div class="p-6 overflow-y-auto">
                    <div class="flex items-center justify-between mb-4">
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Pilih Jenis Usaha Anda secara Spesifik</label>
                        
                        <!-- AI Form di Kanan Atas -->
                        <div class="flex items-center gap-2">
                            <input type="text" name="prompt" bind:value={aiPrompt} placeholder="Atau ketik model bisnis Anda (Misal: Toko Roti)..." class="w-64 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 transition">
                            <button type="submit" formaction="?/generateAiCoa" disabled={isGeneratingAi || !aiPrompt} class="text-xs font-bold bg-slate-900 dark:bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                                ✨ Generate AI
                            </button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {#each businessTypes as type}
                            <label class="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition {selectedTemplate === type.value ? 'bg-indigo-50/50 border-indigo-300 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : ''}">
                                <input type="radio" name="type" value={type.value} bind:group={selectedTemplate} class="mt-0.5 text-indigo-600 focus:ring-indigo-500">
                                <div>
                                    <div class="font-bold text-[11px] text-slate-800 dark:text-slate-100">{type.label}</div>
                                    {#if getDefaultTemplate(unit?.kategori) === type.value}
                                        <div class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider bg-indigo-100/50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded inline-block">* Disarankan</div>
                                    {/if}
                                </div>
                            </label>
                        {/each}
                    </div>
                </div>

                <div class="p-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                    <button type="button" on:click={() => isSeedModalOpen = false} class="text-xs font-bold text-slate-400 dark:text-slate-500 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Batal</button>
                    <button type="submit" formaction="?/seedDefaultCoa" class="text-xs font-black uppercase bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">Generate dari Template</button>
                </div>
            </form>
        </div>
    </div>
{/if}
