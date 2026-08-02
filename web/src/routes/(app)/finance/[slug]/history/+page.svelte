<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation'; 
    import { onMount } from 'svelte'; 
    import { financeUpdate } from '$lib/realtimeStore';
    import jsPDF from 'jspdf';
    import autoTable from 'jspdf-autotable'; 
    import { toastPesan, showRedDot } from '$lib/notifStore';
    import * as XLSX from 'xlsx';
    import { formatRupiah } from '$lib/rupiah.js';

    export let data;

    // --- 1. LOGIKA REALTIME ---
    // Listen for finance updates via Socket.io
    $: if ($financeUpdate) {
        if ($financeUpdate.action === 'stats-updated' || $financeUpdate.action === 'pos-transaction') {
            invalidateAll(); 
        }
    }
    
    // --- 2. FILTER & FORMATTING ---
    let startDate = $page.url.searchParams.get('start') || "";
    let endDate = $page.url.searchParams.get('end') || "";
    let searchQuery = "";
    let jenisFilter = "semua";     // 👈 BARU: semua | masuk | keluar
    let kategoriFilter = "semua";  // 👈 BARU: semua | <namaABC>
    let sortKey = "tanggal";       // 👈 BARU: tanggal | debit | kredit | saldo
    let sortDir = "desc";          // 👈 BARU: asc | desc
    let currentPage = 1;           // 👈 BARU
    let expandedId = null;         // 👈 BARU: id transaksi yang sedang di-expand
    const pageSize = 10;           // 👈 BARU

    function applyFilter() {
        currentPage = 1; // 👈 reset ke halaman 1 setiap kali rentang tanggal berubah
        const url = new URL($page.url);
        url.searchParams.set('start', startDate);
        url.searchParams.set('end', endDate);
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function setMonth(monthIndex) {
        if (monthIndex === "") return;
        const now = new Date();
        const year = now.getFullYear();
        const start = new Date(year, parseInt(monthIndex), 1);
        const end = new Date(year, parseInt(monthIndex) + 1, 0);
        startDate = formatDate(start);
        endDate = formatDate(end);
        applyFilter();
    }

    function setQuickFilter(range) {
        const now = new Date();
        if (range === 'hari-ini') {
            startDate = endDate = formatDate(now);
        } else if (range === 'kemarin') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            startDate = endDate = formatDate(yesterday);
        } else if (range === 'bulan-ini') {
            setMonth(now.getMonth());
            return;
        }
        applyFilter();
    }

    function formatDate(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    }

    // 👇 BARU: satu sumber kebenaran untuk jenis transaksi.
    // Dipakai di filter, sort, export, dan render, biar logikanya konsisten di satu tempat.
    function getKategoriInfo(trx) {
        const original = (trx.kategoriTrx || trx.kategori_trx || "").toString();
        const lower = original.toLowerCase();
        return {
            raw: original,
            isMasuk: lower.includes('masuk'),
            isKeluar: lower.includes('keluar')
        };
    }

    // 👇 BARU: toggle arah sortir kolom
    function toggleSort(key) {
        if (sortKey === key) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey = key;
            sortDir = 'desc';
        }
    }

    // 👇 BARU: klik baris untuk lihat detail
    function toggleExpand(id) {
        expandedId = expandedId === id ? null : id;
    }

    // 👇 BARU: dipakai tombol "Reset Filter" di empty state
    function resetAllFilters() {
        searchQuery = "";
        jenisFilter = "semua";
        kategoriFilter = "semua";
        startDate = "";
        endDate = "";
        applyFilter();
    }

    // --- 3. EXPORT PDF ---
    function exportPDF() {
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const formatIndo = (dateStr) => {
                if (!dateStr) return "";
                const [y, m, d] = dateStr.split('-');
                return `${d}/${m}/${y}`;
            };
            const sekarang = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            let teksPeriode = startDate && endDate ? `PERIODE: ${formatIndo(startDate)} S/D ${formatIndo(endDate)}` : "SEMUA RIWAYAT TRANSAKSI";

            doc.setFontSize(16); doc.text('LAPORAN JURNAL TRANSAKSI', 14, 15);
            doc.setFontSize(10); doc.text(`UNIT BISNIS : ${$page.params.slug.toUpperCase()}`, 14, 22);
            doc.text(teksPeriode, 14, 27);
            doc.text(`DICETAK PADA: ${sekarang}`, 14, 32); 

            // 👇 pakai sortedTransactions (hasil semua filter + sort), bukan cuma 1 halaman
            const tableBody = sortedTransactions.map(trx => {
                const { isMasuk, isKeluar } = getKategoriInfo(trx);
                return [
                    new Date(trx.tanggal).toLocaleDateString('id-ID'),
                    isMasuk ? 'PEMASUKAN' : (isKeluar ? 'PENGELUARAN' : 'LAINNYA'),
                    `#${trx.id.toString().slice(-5)}`,
                    trx.metode_bayar || 'KAS',
                    isMasuk ? formatRupiah(trx.nominal) : '-',
                    isKeluar ? formatRupiah(trx.nominal) : '-',
                    formatRupiah(balanceMap[trx.id] ?? 0), // saldo
                    trx.keterangan.toUpperCase()
                ];
            });

            // Tambahkan Baris Total di PDF
            tableBody.push([
                '', '', '', 'TOTAL',
                liveTotalMasuk.toLocaleString('id-ID'),
                liveTotalKeluar.toLocaleString('id-ID'),                '',
                ''
            ]);

            autoTable(doc, {
                startY: 38,
                head: [['TANGGAL', 'TRANSAKSI', 'KODE', 'AKUN', 'DEBIT (IN)', 'KREDIT (OUT)', 'SALDO', 'CATATAN']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85], halign: 'center' },
                columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
                styles: { fontSize: 8 },
                didParseCell: function (data) {
                    if (data.row.index === tableBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            });
            doc.save(`Jurnal_${$page.params.slug}_${new Date().getTime()}.pdf`);
        } catch (error) { console.error("Gagal ekspor PDF:", error); }
    }

    // --- 4. EXPORT EXCEL ---
    function exportExcel() {
        const dataToExport = sortedTransactions.map(trx => {
            const { isMasuk, isKeluar } = getKategoriInfo(trx);
            return {
                'Tanggal': new Date(trx.tanggal).toLocaleDateString('id-ID'),
                'Jenis': isMasuk ? 'PEMASUKAN' : (isKeluar ? 'PENGELUARAN' : 'LAINNYA'),
                'ABC Category': trx.namaABC ? `[${trx.levelABC}] ${trx.namaABC}` : '-',
                'Keterangan': trx.keterangan,
                'Akun': trx.metode_bayar || 'KAS',
                'Nominal Masuk': isMasuk ? Number(trx.nominal) : 0,
                'Nominal Keluar': isKeluar ? Number(trx.nominal) : 0,
                'Saldo': balanceMap[trx.id] ?? 0 // 👈 BARU
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jurnal Transaksi");
        XLSX.writeFile(wb, `Laporan_${$page.params.slug}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // --- 5. SALDO BERJALAN (BARU) ---
    // Dihitung dari data.transactions (hasil filter TANGGAL dari server saja), supaya saldo per
    // baris tetap akurat ikut urutan buku kas asli — tidak ikut berubah saat search/filter jenis/kategori.
    // data.openingBalance dikirim dari server = total transaksi SEBELUM tanggal "start" filter.
    $: balanceMap = (() => {
        const map = {};
        const chronological = [...data.transactions].sort((a, b) => {
            const diff = new Date(a.tanggal) - new Date(b.tanggal);
            return diff !== 0 ? diff : a.id - b.id;
        });
        let running = data.openingBalance || 0;
        for (const t of chronological) {
            const { isMasuk, isKeluar } = getKategoriInfo(t);
            const nominal = Number(t.nominal) || 0;
            running += isMasuk ? nominal : (isKeluar ? -nominal : 0);
            map[t.id] = running;
        }
        return map;
    })();

    // --- 6. FILTER JENIS, KATEGORI & SEARCH (search lama + 2 filter baru) ---
    $: kategoriOptions = Array.from(
        new Map(
            data.transactions.filter(t => t.namaABC).map(t => [t.namaABC, { namaABC: t.namaABC, levelABC: t.levelABC }])
        ).values()
    ).sort((a, b) => a.namaABC.localeCompare(b.namaABC));

    $: filteredTransactions = data.transactions.filter(t => {
        const { isMasuk, isKeluar } = getKategoriInfo(t);
        const matchSearch = !searchQuery ||
            t.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.metode_bayar && t.metode_bayar.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.namaABC && t.namaABC.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchJenis = jenisFilter === 'semua' ||
            (jenisFilter === 'masuk' && isMasuk) ||
            (jenisFilter === 'keluar' && isKeluar);
        const matchKategori = kategoriFilter === 'semua' || t.namaABC === kategoriFilter;
        return matchSearch && matchJenis && matchKategori;
    });

    // --- 7. SORTIR KOLOM (BARU) ---
    $: sortedTransactions = [...filteredTransactions].sort((a, b) => {
        let valA, valB;
        if (sortKey === 'debit') {
            valA = getKategoriInfo(a).isMasuk ? Number(a.nominal) : 0;
            valB = getKategoriInfo(b).isMasuk ? Number(b.nominal) : 0;
        } else if (sortKey === 'kredit') {
            valA = getKategoriInfo(a).isKeluar ? Number(a.nominal) : 0;
            valB = getKategoriInfo(b).isKeluar ? Number(b.nominal) : 0;
        } else if (sortKey === 'saldo') {
            valA = balanceMap[a.id] ?? 0;
            valB = balanceMap[b.id] ?? 0;
        } else {
            valA = new Date(a.tanggal).getTime();
            valB = new Date(b.tanggal).getTime();
        }
        if (valA === valB) return b.id - a.id;
        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    // --- 8. PAGINATION (BARU) ---
    $: totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
    $: if (currentPage > totalPages) currentPage = totalPages;
    $: rangeStart = sortedTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    $: rangeEnd = Math.min(currentPage * pageSize, sortedTransactions.length);
    $: paginatedTransactions = sortedTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    $: liveTotalMasuk = filteredTransactions.reduce((sum, t) => sum + (getKategoriInfo(t).isMasuk ? Number(t.nominal) : 0), 0);
    $: liveTotalKeluar = filteredTransactions.reduce((sum, t) => sum + (getKategoriInfo(t).isKeluar ? Number(t.nominal) : 0), 0);
    $: liveSaldo = liveTotalMasuk - liveTotalKeluar;
</script>

<div class="min-h-screen  text-[#444]">
    <div class="max-w-[1200px] mx-auto">
        <div class="mb-4">
            <a href={`/finance/${$page.params.slug}`} class="flex items-center gap-2 px-1 py-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-all group w-fit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/>
                </svg>
                <span class="text-[11px] font-black uppercase tracking-widest">Kembali ke Dashboard</span>
            </a>
        </div>

        <div class="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-sm">
            
            <div class="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800">
                <div class="flex items-center gap-2">
                    <div class="flex bg-slate-50 dark:bg-slate-900 p-1 rounded gap-1 border border-slate-100 dark:border-slate-800">
                        <button on:click={() => setQuickFilter('hari-ini')} class="px-2 py-1 text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-indigo-600 rounded transition-all">Hari ini</button>
                        <button on:click={() => setQuickFilter('kemarin')} class="px-2 py-1 text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-indigo-600 rounded transition-all">Kemarin</button>
                        <button on:click={() => setQuickFilter('bulan-ini')} class="px-2 py-1 text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 hover:text-indigo-600 rounded transition-all">Bulan ini</button>
                    </div>

                    <select on:change={(e) => setMonth(e.target.value)} class="text-[10px] font-bold uppercase border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 py-1.5 focus:ring-1 focus:ring-slate-200 cursor-pointer">
                        <option value="">Pilih Bulan</option>
                        {#each ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] as bulan, i}
                            <option value={i}>{bulan}</option>
                        {/each}
                    </select>

                    <div class="flex items-center border border-slate-200 dark:border-slate-700 rounded px-2 py-1 gap-2 bg-white dark:bg-slate-800 ml-2">
                        <input type="date" bind:value={startDate} on:change={applyFilter} class="border-none p-0 text-[10px] focus:ring-0 w-24 font-bold uppercase">
                        <span class="text-slate-300 text-[10px]">-</span>
                        <input type="date" bind:value={endDate} on:change={applyFilter} class="border-none p-0 text-[10px] focus:ring-0 w-24 font-bold uppercase">
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <!-- 👇 BARU: filter jenis -->
                    <select bind:value={jenisFilter} on:change={() => currentPage = 1} class="text-[10px] font-bold uppercase border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 py-1.5 px-2 cursor-pointer focus:ring-1 focus:ring-slate-200">
                        <option value="semua">Semua Jenis</option>
                        <option value="masuk">Pemasukan</option>
                        <option value="keluar">Pengeluaran</option>
                    </select>

                    <!-- 👇 BARU: filter kategori ABC -->
                    <select bind:value={kategoriFilter} on:change={() => currentPage = 1} class="text-[10px] font-bold uppercase border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 py-1.5 px-2 cursor-pointer max-w-[150px] focus:ring-1 focus:ring-slate-200">
                        <option value="semua">Semua Kategori</option>
                        {#each kategoriOptions as opt}
                            <option value={opt.namaABC}>[{opt.levelABC}] {opt.namaABC}</option>
                        {/each}
                    </select>

                    <input type="text" bind:value={searchQuery} on:input={() => currentPage = 1} placeholder="Cari transaksi..." class="text-[11px] border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 w-48 focus:ring-1 focus:ring-slate-200">
                    
                    <button on:click={exportPDF} class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-rose-50 dark:bg-rose-950/30 hover:text-rose-600 hover:border-rose-200 dark:border-rose-900/50 font-bold text-[11px] uppercase transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke-width="2"/></svg>
                        PDF
                    </button>

                    <button on:click={exportExcel} class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 font-bold text-[11px] uppercase transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        XLSX
                    </button>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <th class="p-3 w-6"></th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-28 cursor-pointer select-none hover:text-indigo-600" on:click={() => toggleSort('tanggal')}>
                                Tanggal {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Transaksi</th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kode</th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right cursor-pointer select-none hover:text-indigo-600" on:click={() => toggleSort('debit')}>
                                Debit (In) {sortKey === 'debit' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right cursor-pointer select-none hover:text-indigo-600" on:click={() => toggleSort('kredit')}>
                                Kredit (Out) {sortKey === 'kredit' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right cursor-pointer select-none hover:text-indigo-600" on:click={() => toggleSort('saldo')}>
                                Saldo {sortKey === 'saldo' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Catatan</th>
                            <th class="p-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Aksi</th>
                        </tr>
                    </thead>
                    
                    <tbody class="text-[11px] divide-y divide-slate-50">
                        {#if paginatedTransactions.length === 0}
                            <tr>
                                <td colspan="9" class="p-10 text-center">
                                    <div class="flex flex-col items-center gap-2 text-slate-300">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7l1.5-3h15L21 7M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18M9 11h6"/>
                                        </svg>
                                        <span class="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">Tidak ada transaksi ditemukan</span>
                                        <span class="text-[10px] text-slate-300">Coba ubah filter, kategori, atau kata kunci pencarian</span>
                                        <button on:click={resetAllFilters} class="mt-2 px-3 py-1.5 text-[10px] font-bold uppercase border border-slate-200 dark:border-slate-700 rounded text-indigo-600 hover:bg-indigo-50 dark:bg-indigo-900/30">Reset Filter</button>
                                    </div>
                                </td>
                            </tr>
                        {/if}

                        {#each paginatedTransactions as trx}
                            {@const info = getKategoriInfo(trx)}

                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition-colors cursor-pointer" on:click={() => toggleExpand(trx.id)}>
                                <td class="p-3 align-top text-slate-300">
                                    <svg class="w-3 h-3 transition-transform {expandedId === trx.id ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </td>

                                <td class="p-3 align-top text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                    <span class="font-bold text-slate-600 dark:text-slate-300 uppercase">{new Date(trx.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                    <div class="text-[9px] text-slate-300 font-medium uppercase">{new Date(trx.tanggal).getFullYear()}</div>
                                </td>

                                <td class="p-3 align-top font-bold text-slate-600 dark:text-slate-300 uppercase leading-tight">
                                    {info.isMasuk ? 'Pemasukan' : (info.isKeluar ? 'Pengeluaran' : info.raw)}
                                    <div class="text-[9px] font-medium text-slate-400 dark:text-slate-500">{trx.metode_bayar || 'KAS'}</div>
                                </td>

                                <td class="p-3 align-top text-slate-400 dark:text-slate-500 font-mono">#{trx.id.toString().slice(-5)}</td>
                                
                                <td class="p-3 align-top text-right font-bold text-emerald-600">
                                    {info.isMasuk ? formatRupiah(trx.nominal) : '-'}
                                </td>
                                
                                <td class="p-3 align-top text-right font-bold text-rose-600">
                                    {info.isKeluar ? formatRupiah(trx.nominal) : '-'}
                                </td>

                                <td class="p-3 align-top text-right font-bold text-indigo-700 dark:text-indigo-300">
                                    {formatRupiah(balanceMap[trx.id] ?? 0)}
                                </td>
                                
                                <td class="p-3 align-top">
                                    <div class="text-slate-500 dark:text-slate-400 dark:text-slate-500 italic uppercase leading-tight max-w-xs truncate mb-1">
                                        {trx.keterangan}
                                    </div>
                                    {#if trx.namaABC}
                                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide border
                                            {trx.levelABC === 'A' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                             trx.levelABC === 'B' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                             'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}">
                                            [{trx.levelABC}] {trx.namaABC}
                                        </span>
                                    {/if}
                                </td>

                                <td class="p-3 align-top" on:click|stopPropagation>
                                    <div class="flex items-center justify-center gap-3">
                                        <a href={`/finance/${$page.params.slug}/edit/${trx.id}`} class="text-slate-300 hover:text-indigo-600">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2"/></svg>
                                        </a>
                                        <!-- Invoice Button -->
                                        <a href={`/api/invoice/${trx.id}?type=manual`} target="_blank"
                                           class="text-slate-300 hover:text-indigo-500 transition-colors" title="Cetak Invoice">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                            </svg>
                                        </a>
                                  <form 
    method="POST" 
    action="?/delete" 
    use:enhance={() => {
        // Optimistic UI: Hapus dari layar dulu
        const idDeleted = trx.id;
        const backup = [...data.transactions];
        data.transactions = data.transactions.filter(t => t.id !== idDeleted);

        return async ({ result, update }) => {
            if (result.type === 'success') {
                // 🚀 TRIGER TOAST & RED DOT
                toastPesan.set(result.data.message);
                showRedDot.set(true);

                // Auto-clear toast setelah 3 detik (sama seperti logic URL kamu lurd)
                setTimeout(() => toastPesan.set(''), 3000);
            }

            if (result.type === 'error' || result.type === 'failure') {
                data.transactions = backup;
                toastPesan.set(result.data?.message || "Gagal menghapus!");
                setTimeout(() => toastPesan.set(''), 3000);
            }
            
            // update() akan memicu load ulang riwayatGlobal di layout
            await update();
        };
    }}
>
    <input type="hidden" name="id" value={trx.id}>
    <button class="text-slate-300 hover:text-rose-500 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
        </svg>
    </button>
</form>
                                    </div>
                                </td>
                            </tr>

                            {#if expandedId === trx.id}
                                <tr class="bg-slate-50/40">
                                    <td colspan="9" class="p-4">
                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                                            <div>
                                                <span class="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Keterangan Lengkap</span>
                                                <span class="text-slate-600 dark:text-slate-300">{trx.keterangan}</span>
                                            </div>
                                            <div>
                                                <span class="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Metode Bayar</span>
                                                <span class="text-slate-600 dark:text-slate-300">{trx.metode_bayar || 'KAS'}</span>
                                            </div>
                                            <div>
                                                <span class="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Kategori ABC</span>
                                                <span class="text-slate-600 dark:text-slate-300">{trx.namaABC ? `[${trx.levelABC}] ${trx.namaABC}` : '-'}</span>
                                            </div>
                                            <div>
                                                <span class="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Saldo Setelah Transaksi</span>
                                                <span class="text-indigo-700 dark:text-indigo-300 font-bold">{formatRupiah(balanceMap[trx.id] ?? 0)}</span>
                                            </div>
                                            <div>
                                                <span class="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">ID Transaksi</span>
                                                <span class="text-slate-600 dark:text-slate-300 font-mono">#{trx.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            {/if}
                        {/each}
                    </tbody>

                    <tfoot class="bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-700 dark:text-slate-200">
                        <tr>
                            <td colspan="4" class="p-3 text-right uppercase tracking-wider">Total (Filtered):</td>
                            <td class="p-3 text-right text-emerald-700 bg-emerald-50/50">
                                {formatRupiah(liveTotalMasuk)}
                            </td>
                            <td class="p-3 text-right text-rose-700 bg-rose-50/50">
                                {formatRupiah(liveTotalKeluar)}
                            </td>
                            <td class="p-3"></td>
                            <td colspan="2" class="p-3 text-center text-slate-400 dark:text-slate-500">
                                Net: <span class="{liveSaldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{formatRupiah(liveSaldo)}</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- 👇 BARU: Pagination -->
            <div class="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                <div>
                    Menampilkan {rangeStart}–{rangeEnd} dari {sortedTransactions.length} transaksi
                </div>
                <div class="flex items-center gap-2">
                    <button on:click={() => currentPage = Math.max(1, currentPage - 1)} disabled={currentPage === 1} class="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 hover:text-indigo-600">
                        Prev
                    </button>
                    <span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">Hal {currentPage} / {totalPages}</span>
                    <button on:click={() => currentPage = Math.min(totalPages, currentPage + 1)} disabled={currentPage === totalPages} class="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 hover:text-indigo-600">
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>