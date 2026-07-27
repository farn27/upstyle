<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import SubNav from '$lib/components/SubNav.svelte';
    import { addNotif } from '$lib/notifStore';

    export let data;
    $: ({ unit, assets, accounts } = data);
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    let isAddModalOpen = false;
    let isEditModalOpen = false;
    let selectedAsset = null;

    function openEdit(a) {
        selectedAsset = a;
        isEditModalOpen = true;
    }
</script>

<div class="max-w-6xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Master Data / Aset Tetap</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Manajemen Aset</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Kelola daftar aset tetap perusahaan beserta nilai penyusutannya.</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition shadow flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Tambah Aset
        </button>
    </div>

    <SubNav {slug} />

    <!-- Assets List -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    <tr>
                        <th class="py-3 px-4">Nama Aset</th>
                        <th class="py-3 px-4">Kategori</th>
                        <th class="py-3 px-4">Tgl Perolehan</th>
                        <th class="py-3 px-4 text-right">Nilai Perolehan</th>
                        <th class="py-3 px-4 text-center">Umur (Thn)</th>
                        <th class="py-3 px-4 text-right">Nilai Buku</th>
                        <th class="py-3 px-4 text-center">Status</th>
                        <th class="py-3 px-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    {#if assets.length === 0}
                        <tr>
                            <td colspan="7" class="py-8 text-center text-slate-400 dark:text-slate-500">Belum ada data aset tetap.</td>
                        </tr>
                    {/if}
                    {#each assets as a}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
                            <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{a.namaAset}</td>
                            <td class="py-3 px-4 text-slate-600 dark:text-slate-300">{a.kategori}</td>
                            <td class="py-3 px-4 text-slate-600 dark:text-slate-300">{new Date(a.tanggalPerolehan).toLocaleDateString('id-ID')}</td>
                            <td class="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-200">{rp(a.nilaiPerolehan)}</td>
                            <td class="py-3 px-4 text-center text-slate-600 dark:text-slate-300">{a.umurEkonomis}</td>
                            <td class="py-3 px-4 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">{rp(a.nilaiBuku)}</td>
                            <td class="py-3 px-4 text-center">
                                <span class="px-2 py-1 text-[10px] font-bold rounded-full {a.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'}">
                                    {a.status}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-right flex justify-end gap-2">
                                <button on:click={() => openEdit(a)} class="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition" title="Edit Aset">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <form action="?/deleteAsset" method="POST" use:enhance={() => {
                                    return async ({ result, update }) => {
                                        if (result.type === 'success') { addNotif('Aset dihapus', 'success'); }
                                        else { addNotif('Gagal menghapus', 'error'); }
                                        update();
                                    };
                                }}>
                                    <input type="hidden" name="id" value={a.id}>
                                    <button type="submit" class="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Hapus Aset" on:click={(e) => { if(!confirm('Yakin ingin menghapus aset ini?')) e.preventDefault(); }}>
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

<!-- Modal Tambah Aset -->
{#if isAddModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Tambah Aset Tetap</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/addAsset" method="POST" class="flex flex-col flex-1 overflow-hidden" use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') {
                        isAddModalOpen = false;
                        addNotif('Aset berhasil ditambahkan!', 'success');
                    } else {
                        addNotif(result.data?.error || 'Gagal menyimpan', 'error');
                    }
                    update();
                };
            }}>
                <div class="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nama Aset <span class="text-red-500">*</span></label>
                        <input type="text" name="namaAset" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Kategori</label>
                            <select name="kategori" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="KENDARAAN">Kendaraan</option>
                                <option value="BANGUNAN">Bangunan</option>
                                <option value="MESIN">Mesin & Alat</option>
                                <option value="INVENTARIS">Inventaris Kantor</option>
                                <option value="TANAH">Tanah</option>
                                <option value="LAINNYA">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal Perolehan <span class="text-red-500">*</span></label>
                            <input type="date" name="tanggalPerolehan" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nilai Perolehan (Rp) <span class="text-red-500">*</span></label>
                            <input type="number" name="nilaiPerolehan" required min="0" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nilai Sisa / Residu (Rp)</label>
                            <input type="number" name="nilaiSisa" min="0" value="0" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Umur Ekonomis (Tahun) <span class="text-red-500">*</span></label>
                            <input type="number" name="umurEkonomis" required min="1" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Metode Penyusutan</label>
                            <select name="metodePenyusutan" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="GARIS_LURUS">Garis Lurus</option>
                                <option value="SALDO_MENURUN">Saldo Menurun</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Akun Aset (COA) <span class="text-slate-400 dark:text-slate-500 font-normal ml-1">Opsional</span></label>
                        <select name="coaId" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">-- Pilih Akun --</option>
                            {#each accounts as acc}
                                <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isAddModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Simpan Aset</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Edit Aset -->
{#if isEditModalOpen && selectedAsset}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Edit Aset Tetap</h3>
                <button on:click={() => isEditModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/editAsset" method="POST" class="flex flex-col flex-1 overflow-hidden" use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') {
                        isEditModalOpen = false;
                        addNotif('Aset berhasil diperbarui!', 'success');
                    } else {
                        addNotif(result.data?.error || 'Gagal menyimpan', 'error');
                    }
                    update();
                };
            }}>
                <input type="hidden" name="id" value={selectedAsset.id}>
                <div class="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nama Aset <span class="text-red-500">*</span></label>
                        <input type="text" name="namaAset" value={selectedAsset.namaAset} required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Kategori</label>
                            <select name="kategori" value={selectedAsset.kategori} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="KENDARAAN">Kendaraan</option>
                                <option value="BANGUNAN">Bangunan</option>
                                <option value="MESIN">Mesin & Alat</option>
                                <option value="INVENTARIS">Inventaris Kantor</option>
                                <option value="TANAH">Tanah</option>
                                <option value="LAINNYA">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal Perolehan <span class="text-red-500">*</span></label>
                            <input type="date" name="tanggalPerolehan" value={selectedAsset.tanggalPerolehan.slice(0, 10)} required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nilai Perolehan (Rp) <span class="text-red-500">*</span></label>
                            <input type="number" name="nilaiPerolehan" value={selectedAsset.nilaiPerolehan} required min="0" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nilai Sisa / Residu (Rp)</label>
                            <input type="number" name="nilaiSisa" value={selectedAsset.nilaiSisa} min="0" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Umur Ekonomis (Tahun) <span class="text-red-500">*</span></label>
                            <input type="number" name="umurEkonomis" value={selectedAsset.umurEkonomis} required min="1" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Metode Penyusutan</label>
                            <select name="metodePenyusutan" value={selectedAsset.metodePenyusutan} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="GARIS_LURUS">Garis Lurus</option>
                                <option value="SALDO_MENURUN">Saldo Menurun</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Status Aset</label>
                            <select name="status" value={selectedAsset.status} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="AKTIF">Aktif</option>
                                <option value="DINONAKTIFKAN">Dinonaktifkan</option>
                                <option value="DIJUAL">Dijual / Dilepas</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Akun Aset (COA)</label>
                            <select name="coaId" value={selectedAsset.coaId} class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                                <option value="">-- Pilih Akun --</option>
                                {#each accounts as acc}
                                    <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isEditModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    </div>
{/if}
