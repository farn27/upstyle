<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import SubNav from '$lib/components/SubNav.svelte';

    export let data;
    const { unit, accounts, lines, openingBalance, selectedAccountData } = data;
    $: slug = $page.params.slug;

    let tahun = data.tahun;
    let bulan = data.bulan;
    let accountId = data.accountId;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    async function applyFilter() {
        const u = new URL(window.location.href);
        u.searchParams.set('tahun', tahun);
        u.searchParams.set('bulan', bulan);
        u.searchParams.set('account', accountId);
        await goto(u.toString(), { keepFocus: true, noScroll: true });
    }

    function formatDate(val) {
        if (!val) return '';
        return new Date(val).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
    }

    // Hitung running balance
    let ledgerRows = [];
    $: {
        if (selectedAccountData) {
            let currentBalance = Number(openingBalance || 0);
            const normal = selectedAccountData.normalBalance; // 'DEBIT' atau 'CREDIT'
            
            ledgerRows = lines.map(line => {
                const debit = Number(line.debit || 0);
                const credit = Number(line.credit || 0);
                
                if (normal === 'DEBIT') {
                    currentBalance = currentBalance + debit - credit;
                } else {
                    currentBalance = currentBalance + credit - debit;
                }
                
                return {
                    ...line,
                    balance: currentBalance
                };
            });
        } else {
            ledgerRows = [];
        }
    }
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">Keuangan Pusat</p>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white">Buku Besar</h1>
            <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Lihat mutasi pergerakan saldo untuk setiap akun / perkiraan.</p>
        </div>
        <div class="flex flex-col sm:flex-row items-center gap-3">
            <!-- Filter Akun -->
            <select bind:value={accountId} on:change={applyFilter} class="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none py-2 px-3 shadow-sm font-medium text-slate-700 dark:text-slate-200 w-full sm:w-64">
                <option value="all">-- Pilih Akun --</option>
                {#each accounts as acc}
                    <option value={acc.id}>{acc.accountCode} - {acc.name}</option>
                {/each}
            </select>
            
            <!-- Filter Tanggal -->
            <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm w-full sm:w-auto">
                <select bind:value={bulan} on:change={applyFilter} class="text-xs border-none outline-none bg-transparent py-1 pl-2 pr-6 cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                    <option value="all">Sepanjang Tahun</option>
                    {#each BULAN_NAMES as b, i}
                        <option value={i+1}>{b}</option>
                    {/each}
                </select>
                <div class="w-px h-4 bg-slate-200"></div>
                <select bind:value={tahun} on:change={applyFilter} class="text-xs border-none outline-none bg-transparent py-1 pl-2 pr-6 cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                    <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                </select>
            </div>
        </div>
    </div>

    <SubNav {slug} />

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        {#if accountId === 'all' || !selectedAccountData}
            <div class="p-12 text-center flex flex-col items-center">
                <div class="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Pilih Akun Terlebih Dahulu</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 max-w-sm">Pilih akun dari dropdown di atas untuk melihat detail mutasi, debit, kredit, dan saldo akhir pada buku besar.</p>
            </div>
        {:else}
            <div class="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                    <h3 class="font-black text-slate-900 dark:text-white text-lg">{selectedAccountData.accountCode} - {selectedAccountData.name}</h3>
                    <p class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mt-1">Saldo Normal: {selectedAccountData.normalBalance}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Saldo Awal (Opening)</p>
                    <p class="font-mono font-bold text-slate-900 dark:text-white text-lg">{rp(openingBalance)}</p>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Referensi</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Keterangan</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider text-right">Debit</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider text-right">Kredit</th>
                            <th class="py-3 px-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs divide-y divide-slate-100">
                        <!-- Baris Saldo Awal -->
                        <tr class="bg-indigo-50/30">
                            <td class="py-3 px-4 font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 italic" colspan="5">Saldo Awal Periode</td>
                            <td class="py-3 px-4 font-mono font-bold text-right text-indigo-700 dark:text-indigo-300">{rp(openingBalance)}</td>
                        </tr>
                        
                        <!-- Transaksi -->
                        {#if ledgerRows.length === 0}
                            <tr>
                                <td colspan="6" class="py-8 text-center text-slate-400 dark:text-slate-500 italic">Tidak ada transaksi pada periode ini</td>
                            </tr>
                        {:else}
                            {#each ledgerRows as row}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors">
                                    <td class="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">{formatDate(row.date)}</td>
                                    <td class="py-3 px-4">
                                        <span class="font-mono text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{row.referenceNo}</span>
                                    </td>
                                    <td class="py-3 px-4 text-slate-700 dark:text-slate-200">{row.description}</td>
                                    <td class="py-3 px-4 text-right font-medium {Number(row.debit) > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300'}">
                                        {Number(row.debit) > 0 ? rp(row.debit) : ''}
                                    </td>
                                    <td class="py-3 px-4 text-right font-medium {Number(row.credit) > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300'}">
                                        {Number(row.credit) > 0 ? rp(row.credit) : ''}
                                    </td>
                                    <td class="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                        {rp(row.balance)}
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>
