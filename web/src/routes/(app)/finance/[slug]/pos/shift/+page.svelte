<script>
	import { page } from '$app/stores';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	export let data;
	$: slug = $page.params.slug;
    $: activeShift = data.activeShift;
    $: cashTransactions = data.cashTransactions || [];
    $: shiftHistory = data.shiftHistory || [];

	const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    let showCashModal = false;
    let cashType = 'CASH_IN';
    let cashAmount = 0;
    let cashDesc = '';

    let isSubmitting = false;

    async function handleCashTx() {
        if (!cashAmount || cashAmount <= 0) return alert('Nominal harus > 0');
        if (!activeShift) return alert('Tidak ada shift aktif');
        isSubmitting = true;
        try {
            const res = await fetch(`/finance/${slug}/pos/shift/cash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: cashType, amount: cashAmount, description: cashDesc })
            });
            if (res.ok) {
                alert('Berhasil');
                window.location.reload();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menyimpan transaksi kas');
            }
        } catch (e) {
            alert(e.message);
        } finally {
            isSubmitting = false;
        }
    }
</script>

<PageLayout title="Manajemen Kasir & Shift" subtitle="Atur Modal, Tarikan, Setoran, dan Shift Anda" {slug} unit={data.unit}>
    {#if activeShift}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-900/30 p-5 col-span-1 md:col-span-2 lg:col-span-4 flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-blue-900 dark:text-blue-100 uppercase tracking-widest text-[11px] mb-1">Shift Aktif</h3>
                    <p class="text-sm text-slate-600 dark:text-slate-400">Mulai: {new Date(activeShift.waktuBuka).toLocaleString('id-ID')}</p>
                </div>
                <div class="flex gap-2">
                    <button class="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-bold rounded-lg uppercase" on:click={() => { cashType = 'CASH_IN'; showCashModal = true; }}>+ Setor Kas</button>
                    <button class="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-bold rounded-lg uppercase" on:click={() => { cashType = 'CASH_OUT'; showCashModal = true; }}>- Tarik Kas</button>
                    <a href={`/finance/${slug}/pos`} class="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg uppercase">Tutup Shift di POS</a>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Modal Awal</p>
                <p class="text-lg font-black text-slate-800 dark:text-slate-100 font-mono mt-1">{rp(activeShift.modalAwal)}</p>
            </div>
            
            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Kas Masuk Sesi Ini</p>
                <p class="text-lg font-black text-emerald-600 font-mono mt-1">{rp(cashTransactions.filter(t => t.type === 'CASH_IN').reduce((a,b) => a + Number(b.amount), 0))}</p>
            </div>

            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Kas Keluar Sesi Ini</p>
                <p class="text-lg font-black text-orange-500 font-mono mt-1">{rp(cashTransactions.filter(t => t.type === 'CASH_OUT').reduce((a,b) => a + Number(b.amount), 0))}</p>
            </div>

            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Estimasi Kas Sistem</p>
                <p class="text-lg font-black text-blue-600 font-mono mt-1">{rp(activeShift.kasAkhir)}</p>
            </div>
        </div>
    {:else}
        <div class="mb-6 p-6 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <h3 class="text-slate-700 dark:text-slate-200 font-bold">Tidak ada shift aktif</h3>
            <p class="text-sm text-slate-500 mt-2 mb-4">Mulai shift dengan membuka halaman POS.</p>
            <a href={`/finance/${slug}/pos`} class="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Buka POS</a>
        </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden p-5">
            <h3 class="font-bold text-sm mb-4 uppercase tracking-wider text-slate-700 dark:text-slate-200">Riwayat Setoran/Tarikan Shift Aktif</h3>
            {#if cashTransactions.length === 0}
                <p class="text-xs text-slate-400">Belum ada transaksi kas tambahan di shift ini.</p>
            {:else}
                <div class="space-y-3">
                    {#each cashTransactions as tx}
                        <div class="flex justify-between items-center p-3 rounded-lg border {tx.type === 'CASH_IN' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}">
                            <div>
                                <p class="text-[10px] font-black uppercase {tx.type === 'CASH_IN' ? 'text-emerald-700' : 'text-orange-700'}">{tx.type === 'CASH_IN' ? 'Setor Kas' : 'Tarik Kas'}</p>
                                <p class="text-xs text-slate-600 font-medium mt-0.5">{tx.description || '-'}</p>
                                <p class="text-[9px] text-slate-400 mt-1">{new Date(tx.createdAt).toLocaleTimeString('id-ID')}</p>
                            </div>
                            <span class="font-mono font-bold {tx.type === 'CASH_IN' ? 'text-emerald-700' : 'text-orange-700'}">
                                {tx.type === 'CASH_IN' ? '+' : '-'}{rp(tx.amount)}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden p-5">
            <h3 class="font-bold text-sm mb-4 uppercase tracking-wider text-slate-700 dark:text-slate-200">Riwayat Tutup Shift</h3>
            {#if shiftHistory.length === 0}
                <p class="text-xs text-slate-400">Belum ada riwayat shift.</p>
            {:else}
                <div class="space-y-3 max-h-[500px] overflow-y-auto">
                    {#each shiftHistory as sh}
                        <div class="p-4 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <span class="text-[9px] px-2 py-0.5 rounded font-bold {sh.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}">{sh.status}</span>
                                    <p class="text-[10px] text-slate-500 mt-2 font-bold">{new Date(sh.waktuBuka).toLocaleString('id-ID')} - {sh.waktuTutup ? new Date(sh.waktuTutup).toLocaleTimeString('id-ID') : 'Sekarang'}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[9px] text-slate-400 uppercase font-bold">Selisih Kas</p>
                                    <p class="text-sm font-black font-mono {Number(sh.selisih) === 0 ? 'text-slate-500' : (Number(sh.selisih) > 0 ? 'text-emerald-500' : 'text-red-500')}">
                                        {Number(sh.selisih) > 0 ? '+' : ''}{rp(sh.selisih)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</PageLayout>

{#if showCashModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 class="text-lg font-black uppercase text-slate-800 dark:text-slate-100 mb-4">{cashType === 'CASH_IN' ? 'Setor Kas' : 'Tarik Kas'}</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nominal</label>
                    <div class="relative mt-1">
                        <input type="number" bind:value={cashAmount} class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 font-mono font-bold outline-none focus:border-blue-500">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
                    </div>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keterangan</label>
                    <textarea bind:value={cashDesc} class="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500" rows="3" placeholder="Contoh: Tambah receh..."></textarea>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button class="flex-1 py-3 text-slate-500 font-bold uppercase text-[10px] bg-slate-100 hover:bg-slate-200 rounded-xl transition" on:click={() => showCashModal = false}>Batal</button>
                <button disabled={isSubmitting} class="flex-[2] py-3 text-white font-bold uppercase text-[10px] bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50" on:click={handleCashTx}>Simpan</button>
            </div>
        </div>
    </div>
{/if}
