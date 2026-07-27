<script>
    import { page } from '$app/stores';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    const { unit, entries, tahun, bulan } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    function formatDate(val) {
        if (!val) return '';
        return new Date(val).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
    }

    let isAddModalOpen = false;

    function handleFilter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const y = formData.get('tahun');
        const m = formData.get('bulan');
        window.location.href = `/finance/${slug}/jurnal-umum?tahun=${y}&bulan=${m}`;
    }
</script>

<div class="max-w-6xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Akuntansi / Jurnal Umum</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Jurnal Umum</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Riwayat pencatatan transaksi ganda (Double-Entry).</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buat Jurnal Manual
        </button>
    </div>

    <SubNav {slug} />

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <!-- Filter Header -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <form on:submit={handleFilter} class="flex gap-3 items-end">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase mb-1">Bulan</label>
                    <select name="bulan" class="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium">
                        <option value="all" selected={bulan === 'all'}>Semua Bulan</option>
                        {#each Array(12).fill(0) as _, i}
                            <option value={i+1} selected={bulan == (i+1)}>{new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase mb-1">Tahun</label>
                    <select name="tahun" class="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-medium">
                        <option value={tahun}>{tahun}</option>
                        <option value={tahun-1}>{tahun-1}</option>
                        <option value={tahun-2}>{tahun-2}</option>
                    </select>
                </div>
                <button type="submit" class="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition shadow-sm">Terapkan</button>
            </form>
        </div>

        {#if entries.length === 0}
            <div class="p-12 text-center flex flex-col items-center">
                <div class="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Belum ada jurnal</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 max-w-sm">Transaksi penjualan, pengeluaran, atau jurnal manual akan tercatat otomatis di sini sebagai sistem pembukuan ganda (Double-Entry).</p>
            </div>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider w-32">Tanggal</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">No Referensi</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider w-64">Keterangan</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider text-right w-40">Debit</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider text-right w-40">Kredit</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs divide-y divide-slate-100">
                        {#each entries as entry}
                            <!-- Baris Header Jurnal -->
                            <tr class="bg-slate-50/30 dark:bg-slate-900/30">
                                <td class="py-3 px-4 align-top font-medium text-slate-600 dark:text-slate-300">
                                    {formatDate(entry.tanggal)}
                                </td>
                                <td class="py-3 px-4 align-top">
                                    <span class="font-mono text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{entry.referensi || `JRN-${entry.id}`}</span>
                                    {#if entry.sourceType}
                                        <div class="mt-1 text-[9px] uppercase font-bold text-indigo-500">{entry.sourceType}</div>
                                    {/if}
                                </td>
                                <td class="py-3 px-4 align-top text-slate-700 dark:text-slate-200 font-medium">{entry.memo}</td>
                                <td class="py-3 px-4 align-top text-right text-slate-400 dark:text-slate-500 font-medium">—</td>
                                <td class="py-3 px-4 align-top text-right text-slate-400 dark:text-slate-500 font-medium">—</td>
                            </tr>
                            
                            <!-- Baris Rincian Akun (Lines) -->
                            {#each entry.lines as line}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors">
                                    <td class="py-2 px-4" colspan="2"></td>
                                    <td class="py-2 px-4 font-medium flex items-center gap-2 {Number(line.kredit) > 0 ? 'pl-8' : ''}">
                                        <span class="font-mono text-[10px] text-slate-400 dark:text-slate-500">{line.account?.kodeAkun}</span>
                                        <span class="text-slate-800 dark:text-slate-100">{line.account?.namaAkun || '-'}</span>
                                    </td>
                                    <td class="py-2 px-4 text-right font-medium {Number(line.debit) > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300'}">
                                        {Number(line.debit) > 0 ? rp(line.debit) : ''}
                                    </td>
                                    <td class="py-2 px-4 text-right font-medium {Number(line.kredit) > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300'}">
                                        {Number(line.kredit) > 0 ? rp(line.kredit) : ''}
                                    </td>
                                </tr>
                            {/each}
                            <!-- Spasi antar jurnal -->
                            <tr>
                                <td colspan="5" class="h-2 bg-white dark:bg-slate-800"></td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<!-- Add Manual Journal Modal -->
{#if isAddModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Buat Jurnal Manual</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <form action="?/createManualJournal" method="POST" class="flex flex-col flex-1 overflow-hidden" on:submit={() => isAddModalOpen = false}>
                <div class="p-6 overflow-y-auto space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal Transaksi <span class="text-red-500">*</span></label>
                            <input type="date" name="tanggal" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">No. Referensi (Opsional)</label>
                            <input type="text" name="referensi" placeholder="Misal: INV-2024-001" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Deskripsi / Memo <span class="text-red-500">*</span></label>
                        <input type="text" name="memo" required placeholder="Keterangan transaksi..." class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                    </div>

                    <div class="mt-6">
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Rincian Akun (Debit & Kredit)</label>
                        <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                    <tr>
                                        <th class="py-2 px-3 w-1/2">Akun Perkiraan</th>
                                        <th class="py-2 px-3 text-right">Debit (Rp)</th>
                                        <th class="py-2 px-3 text-right">Kredit (Rp)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Baris 1 -->
                                    <tr class="border-b border-slate-100 dark:border-slate-800">
                                        <td class="p-2">
                                            <select name="account_id_0" required class="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs outline-none">
                                                <option value="">-- Pilih Akun --</option>
                                                {#each data.accounts as acc}
                                                    <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun}</option>
                                                {/each}
                                            </select>
                                        </td>
                                        <td class="p-2"><input type="number" name="debit_0" placeholder="0" class="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-right outline-none"></td>
                                        <td class="p-2"><input type="number" name="kredit_0" placeholder="0" class="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-right outline-none"></td>
                                    </tr>
                                    <!-- Baris 2 -->
                                    <tr class="border-b border-slate-100 dark:border-slate-800">
                                        <td class="p-2">
                                            <select name="account_id_1" required class="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs outline-none">
                                                <option value="">-- Pilih Akun --</option>
                                                {#each data.accounts as acc}
                                                    <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun}</option>
                                                {/each}
                                            </select>
                                        </td>
                                        <td class="p-2"><input type="number" name="debit_1" placeholder="0" class="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-right outline-none"></td>
                                        <td class="p-2"><input type="number" name="kredit_1" placeholder="0" class="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-right outline-none"></td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="bg-amber-50 p-2 text-[10px] text-amber-700 font-medium">
                                * Pastikan total nominal Debit sama dengan total nominal Kredit (Balance).
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isAddModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Simpan Jurnal</button>
                </div>
            </form>
        </div>
    </div>
{/if}
