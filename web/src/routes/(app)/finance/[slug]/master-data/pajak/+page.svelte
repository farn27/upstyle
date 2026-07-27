<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import SubNav from '$lib/components/SubNav.svelte';
    import { addNotif } from '$lib/notifStore';

    export let data;
    $: ({ unit, taxes, accounts } = data);
    $: slug = $page.params.slug;

    let isAddModalOpen = false;
    let isEditModalOpen = false;
    let selectedTax = null;

    function openEdit(t) {
        selectedTax = t;
        isEditModalOpen = true;
    }
</script>

<div class="max-w-4xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Master Data / Pajak</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Manajemen Pajak</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Kelola daftar persentase pajak (PPN, PPh) yang digunakan dalam sistem.</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition shadow flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Tambah Pajak
        </button>
    </div>

    <SubNav {slug} />

    <!-- Taxes List -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    <tr>
                        <th class="py-3 px-4">Nama Pajak</th>
                        <th class="py-3 px-4">Persentase</th>
                        <th class="py-3 px-4">Tipe</th>
                        <th class="py-3 px-4 text-center">Default</th>
                        <th class="py-3 px-4 text-center">Status</th>
                        <th class="py-3 px-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    {#if taxes.length === 0}
                        <tr>
                            <td colspan="5" class="py-8 text-center text-slate-400 dark:text-slate-500">Belum ada daftar pajak.</td>
                        </tr>
                    {/if}
                    {#each taxes as t}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
                            <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{t.namaPajak}</td>
                            <td class="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-300">{t.persentase}%</td>
                            <td class="py-3 px-4 text-slate-600 dark:text-slate-300">{t.tipe}</td>
                            <td class="py-3 px-4 text-center">
                                {#if t.isDefault}
                                    <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">DEFAULT</span>
                                {/if}
                            </td>
                            <td class="py-3 px-4 text-center">
                                <span class="px-2 py-1 text-[10px] font-bold rounded-full {t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'}">
                                    {t.isActive ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-right flex justify-end gap-2">
                                <button on:click={() => openEdit(t)} class="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Edit Pajak">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <form action="?/deleteTax" method="POST" use:enhance={() => {
                                    return async ({ result, update }) => {
                                        if (result.type === 'success') { addNotif('Pajak dihapus', 'success'); }
                                        else { addNotif('Gagal menghapus', 'error'); }
                                        update();
                                    };
                                }}>
                                    <input type="hidden" name="id" value={t.id}>
                                    <button type="submit" class="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Hapus Pajak" on:click={(e) => { if(!confirm('Yakin ingin menghapus pajak ini?')) e.preventDefault(); }}>
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Tambah Pajak -->
{#if isAddModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Tambah Pajak Baru</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/addTax" method="POST" class="flex flex-col flex-1 overflow-hidden" use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') {
                        isAddModalOpen = false;
                        addNotif('Pajak berhasil ditambahkan!', 'success');
                    } else {
                        addNotif(result.data?.error || 'Gagal menyimpan', 'error');
                    }
                    update();
                };
            }}>
                <div class="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nama Pajak <span class="text-red-500">*</span></label>
                        <input type="text" name="namaPajak" placeholder="Misal: PPN 11%" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tipe Pajak</label>
                        <select name="tipe" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="PPN">PPN</option>
                            <option value="PPH">PPh</option>
                            <option value="LAINNYA">Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Persentase (%) <span class="text-red-500">*</span></label>
                        <input type="number" name="persentase" step="0.01" required min="0" max="100" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Akun Penampung COA <span class="text-slate-400 dark:text-slate-500 font-normal ml-1">Opsional</span></label>
                        <select name="coaId" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">-- Pilih Akun --</option>
                            {#each accounts as acc}
                                <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun}</option>
                            {/each}
                        </select>
                    </div>
                    <label class="flex items-center gap-2 mt-2">
                        <input type="checkbox" name="isDefault" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Jadikan Pajak Default di Transaksi</span>
                    </label>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isAddModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Simpan Pajak</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Edit Pajak -->
{#if isEditModalOpen && selectedTax}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Edit Pajak</h3>
                <button on:click={() => isEditModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/editTax" method="POST" class="flex flex-col flex-1 overflow-hidden" use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') {
                        isEditModalOpen = false;
                        addNotif('Pajak berhasil diperbarui!', 'success');
                    } else {
                        addNotif(result.data?.error || 'Gagal menyimpan', 'error');
                    }
                    update();
                };
            }}>
                <input type="hidden" name="id" value={selectedTax.id}>
                <div class="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nama Pajak <span class="text-red-500">*</span></label>
                        <input type="text" name="namaPajak" value={selectedTax.namaPajak} required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tipe Pajak</label>
                        <select name="tipe" value={selectedTax.tipe} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="PPN">PPN</option>
                            <option value="PPH">PPh</option>
                            <option value="LAINNYA">Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Persentase (%) <span class="text-red-500">*</span></label>
                        <input type="number" name="persentase" value={selectedTax.persentase} step="0.01" required min="0" max="100" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Akun Penampung COA <span class="text-slate-400 dark:text-slate-500 font-normal ml-1">Opsional</span></label>
                        <select name="coaId" value={selectedTax.coaId} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">-- Pilih Akun --</option>
                            {#each accounts as acc}
                                <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun}</option>
                            {/each}
                        </select>
                    </div>
                    <label class="flex items-center gap-2 mt-2">
                        <input type="checkbox" name="isDefault" checked={selectedTax.isDefault === 1} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Jadikan Pajak Default di Transaksi</span>
                    </label>
                    <label class="flex items-center gap-2 mt-2">
                        <input type="checkbox" name="isActive" checked={selectedTax.isActive === 1} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Aktif digunakan</span>
                    </label>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isEditModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    </div>
{/if}
