<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    export let form;

    $: periods = data.periods || [];
    $: slug = $page.params.slug;
    $: unit = data.unit || {};

    let isCloseModalOpen = false;
    let formBody = {
        start: '',
        end: '',
        notes: ''
    };

    function openCloseModal() {
        formBody = { start: '', end: '', notes: '' };
        isCloseModalOpen = true;
    }
</script>

<svelte:head>
    <title>Tutup Buku — {unit.namaUnit || slug}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
                <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Master Data / Tutup Buku</p>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white leading-tight">Tutup Buku (Lock Period)</h1>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kunci pencatatan jurnal keuangan pada periode tertentu untuk audit.</p>
            </div>

            <div class="flex items-center gap-2">
                <a href={`/finance/${slug}/master-data`} class="text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition">
                    Kembali ke Hub
                </a>
                <button on:click={openCloseModal} class="text-xs bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition">
                    🔒 Kunci Periode Baru
                </button>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <SubNav {slug} />
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {#if form?.message}
            <div in:fade class="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {form.message}
            </div>
        {/if}

        <div class="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl text-xs leading-relaxed">
            💡 <strong>Info Penting:</strong> Setelah suatu periode dikunci (Tutup Buku), tidak ada user (staff maupun owner) yang dapat menambahkan, mengedit, atau menghapus transaksi pada rentang tanggal tersebut. Pastikan semua laporan laba rugi sudah diaudit secara benar sebelum mengunci periode.
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table class="min-w-full text-xs text-left">
                <thead class="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                        <th class="px-6 py-3">Awal Periode</th>
                        <th class="px-6 py-3">Akhir Periode</th>
                        <th class="px-6 py-3">Tgl Dikunci</th>
                        <th class="px-6 py-3">Catatan Audit</th>
                        <th class="px-6 py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    {#if periods.length === 0}
                        <tr>
                            <td colspan="5" class="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                Belum ada periode pembukuan yang dikunci lurd.
                            </td>
                        </tr>
                    {:else}
                        {#each periods as item (item.id)}
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition">
                                <td class="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-100">{new Date(item.periodStart).toLocaleDateString('id-ID')}</td>
                                <td class="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-100">{new Date(item.periodEnd).toLocaleDateString('id-ID')}</td>
                                <td class="px-6 py-4 text-slate-500 dark:text-slate-400 dark:text-slate-500">{new Date(item.closedAt).toLocaleString('id-ID')}</td>
                                <td class="px-6 py-4 text-slate-400 dark:text-slate-500">{item.keterangan || '—'}</td>
                                <td class="px-6 py-4 text-right">
                                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-rose-50 dark:bg-rose-950/30 text-rose-700 border-rose-100">
                                        LOCKED
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Close Modal -->
{#if isCloseModalOpen}
    <div in:fade="{{ duration: 150 }}" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div in:scale class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div class="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 class="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">🔒 Kunci Periode Pembukuan</h3>
                <button on:click={() => isCloseModalOpen = false} class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">✕</button>
            </div>
            <form method="POST" action="?/closePeriod" use:enhance={() => { isCloseModalOpen = false; }} class="p-6 space-y-4">
                <div>
                    <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Mulai Tanggal</label>
                    <input name="start" type="date" required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                </div>
                <div>
                    <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Sampai Tanggal</label>
                    <input name="end" type="date" required class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition" />
                </div>
                <div>
                    <label class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Catatan Tutup Buku</label>
                    <textarea name="notes" placeholder="Misal: Audit Semester I Selesai" rows="3" class="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800 transition"></textarea>
                </div>

                <div class="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-2">
                    <button type="button" on:click={() => isCloseModalOpen = false} class="text-xs font-bold text-slate-400 dark:text-slate-500 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">Batal</button>
                    <button type="submit" class="text-xs font-black uppercase bg-rose-600 text-white px-5 py-2.5 rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-100">Kunci Sekarang</button>
                </div>
            </form>
        </div>
    </div>
{/if}
