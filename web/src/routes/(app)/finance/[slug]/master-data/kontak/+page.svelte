<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { fade, scale } from 'svelte/transition';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    export let form;

    $: contacts = data.contacts || [];
    $: slug = $page.params.slug;
    $: unit = data.unit || {};

    let search = '';
    let filterType = 'semua';

    const contactTypes = {
        'CUSTOMER': { label: 'Customer', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50' },
        'SUPPLIER': { label: 'Supplier', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        'BOTH': { label: 'Supplier & Customer', color: 'bg-violet-50 text-violet-700 border-violet-100' }
    };

    $: filteredContacts = contacts.filter(item => {
        const matchSearch = !search || 
            item.namaKontak.toLowerCase().includes(search.toLowerCase()) || 
            (item.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.telepon || '').toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'semua' || item.tipeKontak === filterType;
        return matchSearch && matchType;
    });

    let isAddModalOpen = false;
    let isEditModalOpen = false;
    let selectedContact = null;

    let formBody = {
        id: '',
        namaKontak: '',
        tipeKontak: 'CUSTOMER',
        email: '',
        telepon: '',
        alamat: '',
        limitKredit: '0.00',
        termPembayaran: 30
    };

    function openAddModal() {
        formBody = { id: '', namaKontak: '', tipeKontak: 'CUSTOMER', email: '', telepon: '', alamat: '', limitKredit: '0.00', termPembayaran: 30 };
        isAddModalOpen = true;
    }

    function openEditModal(item) {
        selectedContact = item;
        formBody = { ...item };
        isEditModalOpen = true;
    }

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
</script>

<svelte:head>
    <title>Kontak Akuntansi — {unit.namaUnit || slug}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
                <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Master Data / Kontak</p>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white leading-tight">Kontak Supplier & Customer</h1>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kelola daftar kontak untuk pencatatan piutang (AR) dan hutang (AP).</p>
            </div>

            <div class="flex items-center gap-2">
                <a href={`/finance/${slug}/master-data`} class="text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition">
                    Kembali ke Hub
                </a>
                <button on:click={openAddModal} class="text-xs bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition">
                    + Tambah Kontak Baru
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
            <div in:fade class="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {form.message}
            </div>
        {/if}

        <!-- Search / Filter bar -->
        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex gap-3 flex-wrap items-center shadow-sm">
            <div class="relative flex-1 min-w-[200px]">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input bind:value={search} placeholder="Cari nama, email, atau telepon..." class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
            </div>

            <select bind:value={filterType} class="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                <option value="semua">Semua Tipe Kontak</option>
                {#each Object.entries(contactTypes) as [key, val]}
                    <option value={key}>{val.label}</option>
                {/each}
            </select>

            <span class="text-xs font-bold text-slate-400 dark:text-slate-500">{filteredContacts.length} kontak ditemukan</span>
        </div>

        <!-- Table -->
        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
                <table class="min-w-full text-xs text-left">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th class="px-6 py-3">Nama Kontak</th>
                            <th class="px-6 py-3">Tipe</th>
                            <th class="px-6 py-3">Kontak Info</th>
                            <th class="px-6 py-3">Term Pembayaran</th>
                            <th class="px-6 py-3">Limit Kredit</th>
                            <th class="px-6 py-3">Alamat</th>
                            <th class="px-6 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        {#if filteredContacts.length === 0}
                            <tr>
                                <td colspan="7" class="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                    Belum ada kontak terdaftar. Tambah kontak supplier/customer pertama Anda lurd.
                                </td>
                            </tr>
                        {:else}
                            {#each filteredContacts as item (item.id)}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition">
                                    <td class="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">{item.namaKontak}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border {contactTypes[item.tipeKontak]?.color || 'bg-slate-100 dark:bg-slate-800/80'}">
                                            {contactTypes[item.tipeKontak]?.label || item.tipeKontak}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4">
                                        {#if item.email}<div class="text-slate-700 dark:text-slate-200">{item.email}</div>{/if}
                                        {#if item.telepon}<div class="text-slate-400 dark:text-slate-500 font-mono mt-0.5">{item.telepon}</div>{/if}
                                        {#if !item.email && !item.telepon}—{/if}
                                    </td>
                                    <td class="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.termPembayaran} Hari (Net)</td>
                                    <td class="px-6 py-4 text-slate-800 dark:text-slate-100 font-bold">{rp(item.limitKredit)}</td>
                                    <td class="px-6 py-4 text-slate-400 dark:text-slate-500 max-w-xs truncate" title={item.alamat}>{item.alamat || '—'}</td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="inline-flex gap-2">
                                            <button on:click={() => openEditModal(item)} class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 font-black">Edit</button>
                                            <form method="POST" action="?/deleteContact" use:enhance>
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
    <div in:fade="{{ duration: 150 }}" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div in:scale="{{ start: 0.95, duration: 150 }}" class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 class="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Registrasi Kontak Baru</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">✕</button>
            </div>
            <form method="POST" action="?/addContact" use:enhance={() => { isAddModalOpen = false; }} class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Nama Lengkap</label>
                        <input name="namaKontak" placeholder="PT. Global Niaga" required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tipe Hubungan</label>
                        <select name="tipeKontak" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            <option value="CUSTOMER">Customer (Pembeli)</option>
                            <option value="SUPPLIER">Supplier (Pemasok)</option>
                            <option value="BOTH">Keduanya (Supplier & Customer)</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Email</label>
                        <input name="email" type="email" placeholder="kontak@global.com" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Telepon</label>
                        <input name="telepon" placeholder="08123456789" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Limit Kredit (Piutang)</label>
                        <input name="limitKredit" type="number" value="0" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Jatuh Tempo Default</label>
                        <select name="termPembayaran" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            <option value="15">15 Hari (Net 15)</option>
                            <option value="30" selected>30 Hari (Net 30)</option>
                            <option value="45">45 Hari (Net 45)</option>
                            <option value="60">60 Hari (Net 60)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Alamat Lengkap</label>
                    <textarea name="alamat" placeholder="Jl. Sudirman No. 12, Jakarta" rows="3" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition"></textarea>
                </div>

                <div class="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-2">
                    <button type="button" on:click={() => isAddModalOpen = false} class="text-xs font-bold text-slate-400 dark:text-slate-500 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">Batal</button>
                    <button type="submit" class="text-xs font-black uppercase bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">Simpan Kontak</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit Modal -->
{#if isEditModalOpen}
    <div in:fade="{{ duration: 150 }}" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div in:scale="{{ start: 0.95, duration: 150 }}" class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 class="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Edit Kontak Akuntansi</h3>
                <button on:click={() => isEditModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">✕</button>
            </div>
            <form method="POST" action="?/editContact" use:enhance={() => { isEditModalOpen = false; }} class="p-6 space-y-4">
                <input type="hidden" name="id" value={formBody.id} />
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Nama Lengkap</label>
                        <input name="namaKontak" bind:value={formBody.namaKontak} required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tipe Hubungan</label>
                        <select name="tipeKontak" bind:value={formBody.tipeKontak} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            <option value="CUSTOMER">Customer (Pembeli)</option>
                            <option value="SUPPLIER">Supplier (Pemasok)</option>
                            <option value="BOTH">Keduanya (Supplier & Customer)</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Email</label>
                        <input name="email" bind:value={formBody.email} type="email" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Telepon</label>
                        <input name="telepon" bind:value={formBody.telepon} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Limit Kredit (Piutang)</label>
                        <input name="limitKredit" type="number" bind:value={formBody.limitKredit} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                    </div>
                    <div>
                        <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Jatuh Tempo Default</label>
                        <select name="termPembayaran" bind:value={formBody.termPembayaran} class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                            <option value="15">15 Hari (Net 15)</option>
                            <option value="30">30 Hari (Net 30)</option>
                            <option value="45">45 Hari (Net 45)</option>
                            <option value="60">60 Hari (Net 60)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Alamat Lengkap</label>
                    <textarea name="alamat" bind:value={formBody.alamat} rows="3" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition"></textarea>
                </div>

                <div class="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-2">
                    <button type="button" on:click={() => isEditModalOpen = false} class="text-xs font-bold text-slate-400 dark:text-slate-500 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">Batal</button>
                    <button type="submit" class="text-xs font-black uppercase bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    </div>
{/if}
