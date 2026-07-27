<script>
    import { page } from '$app/stores';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    const { unit, tahun, budgets, accounts } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
    const namaBulan = (b) => {
        if (b === 0) return 'Tahunan (Annual)';
        return new Date(2000, b - 1, 1).toLocaleDateString('id-ID', { month: 'long' });
    };

    let isAddModalOpen = false;

    function handleFilter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const y = formData.get('tahun');
        window.location.href = `/finance/${slug}/master-data/budgeting?tahun=${y}`;
    }

    $: totalAnggaran = budgets.reduce((acc, curr) => acc + Number(curr.nominal), 0);
    $: totalRealisasi = budgets.reduce((acc, curr) => acc + curr.realisasi, 0);
    $: sisa = totalAnggaran - totalRealisasi;
</script>

<div class="max-w-5xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Master Data / Budgeting</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Anggaran (Budgeting)</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Kelola batas anggaran pengeluaran perusahaan per akun dan per periode.</p>
        </div>
        <button on:click={() => isAddModalOpen = true} class="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition shadow flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Buat Anggaran
        </button>
    </div>

    <SubNav {slug} />

    <!-- Filter -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 flex justify-between items-center">
        <form on:submit={handleFilter} class="flex gap-3 items-end">
            <div>
                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase mb-1">Tahun Anggaran</label>
                <select name="tahun" class="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-bold">
                    <option value={tahun}>{tahun}</option>
                    <option value={tahun-1}>{tahun-1}</option>
                    <option value={tahun+1}>{tahun+1}</option>
                </select>
            </div>
            <button type="submit" class="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-sm font-bold hover:bg-indigo-100 transition shadow-sm">Terapkan</button>
        </form>
    </div>

    <!-- SUMMARY CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full"></div>
            <p class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 relative z-10">Total Rencana Anggaran</p>
            <p class="text-2xl font-black font-mono text-slate-800 dark:text-slate-100 relative z-10">{rp(totalAnggaran)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full"></div>
            <p class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 relative z-10">Total Realisasi (Terpakai)</p>
            <p class="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 relative z-10">{rp(totalRealisasi)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 {sisa < 0 ? 'bg-rose-50 dark:bg-rose-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'} rounded-full"></div>
            <p class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 relative z-10">Sisa Plafon Gabungan</p>
            <p class="text-2xl font-black font-mono {sisa < 0 ? 'text-rose-600' : 'text-emerald-600'} relative z-10">{rp(sisa)}</p>
        </div>
    </div>

    <!-- Budgets List Dashboard -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400">
                    <tr>
                        <th class="py-3 px-4 w-32">Periode</th>
                        <th class="py-3 px-4">Akun Perkiraan</th>
                        <th class="py-3 px-4 text-right">Target Anggaran</th>
                        <th class="py-3 px-4 text-right">Realisasi (Terpakai)</th>
                        <th class="py-3 px-4 w-48">Progres Limit</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {#if budgets.length === 0}
                        <tr>
                            <td colspan="5" class="py-8 text-center text-slate-400 dark:text-slate-500">Belum ada data anggaran untuk tahun ini.</td>
                        </tr>
                    {/if}
                    {#each budgets as b}
                        {@const p = Number(b.nominal) > 0 ? (b.realisasi / Number(b.nominal)) * 100 : 0}
                        {@const wColor = p >= 100 ? 'bg-rose-500' : p >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
                            <td class="py-3 px-4 font-bold text-indigo-700 dark:text-indigo-300">{namaBulan(b.bulan)}</td>
                            <td class="py-3 px-4">
                                <div class="font-bold text-slate-800 dark:text-slate-100">{b.namaAkun}</div>
                                <div class="text-[10px] font-mono text-slate-500 dark:text-slate-400">{b.kodeAkun} &bull; {b.keterangan || 'Tidak ada catatan'}</div>
                            </td>
                            <td class="py-3 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{rp(b.nominal)}</td>
                            <td class="py-3 px-4 text-right font-mono font-bold {p >= 100 ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}">{rp(b.realisasi)}</td>
                            <td class="py-3 px-4">
                                <div class="flex items-center justify-between text-[10px] font-bold mb-1.5">
                                    <span class={p >= 100 ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}>{p.toFixed(1)}%</span>
                                    {#if p >= 100}
                                        <span class="text-rose-600 font-black animate-pulse">OVER LIMIT</span>
                                    {/if}
                                </div>
                                <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                    <div class="h-full {wColor} transition-all duration-1000" style="width: {Math.min(p, 100)}%;"></div>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Tambah Anggaran -->
{#if isAddModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 class="font-black text-slate-800 dark:text-slate-100">Buat Anggaran Baru</h3>
                <button on:click={() => isAddModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form action="?/addBudget" method="POST" class="flex flex-col flex-1 overflow-hidden" on:submit={() => isAddModalOpen = false}>
                <div class="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Akun (COA) <span class="text-red-500">*</span></label>
                        <select name="coaId" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="">-- Pilih Akun --</option>
                            {#each accounts as acc}
                                <option value={acc.id}>[{acc.kodeAkun}] {acc.namaAkun} ({acc.tipeAkun})</option>
                            {/each}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tahun <span class="text-red-500">*</span></label>
                            <input type="number" name="tahun" value={tahun} required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Bulan <span class="text-red-500">*</span></label>
                            <select name="bulan" required class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                <option value="0">Tahunan (Annual)</option>
                                {#each Array(12).fill(0) as _, i}
                                    <option value={i+1}>{new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nominal Anggaran (Rp) <span class="text-red-500">*</span></label>
                        <input type="number" name="nominal" required min="0" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Keterangan / Tujuan</label>
                        <input type="text" name="keterangan" placeholder="Contoh: Limit iklan Meta bulanan" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                    </div>
                </div>
                
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 mt-auto">
                    <button type="button" on:click={() => isAddModalOpen = false} class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 rounded-lg transition">Batal</button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow hover:bg-indigo-700 transition">Simpan Anggaran</button>
                </div>
            </form>
        </div>
    </div>
{/if}
