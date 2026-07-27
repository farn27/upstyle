import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts, transaksi, products } from '$lib/server/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';

export const load = async ({ params, url, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const tahun = parseInt(url.searchParams.get('tahun') || thisMonthWIB().year);
    const bulan = url.searchParams.get('bulan') || 'all';

    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    let dateFilterJurnal = sql`YEAR(${journalEntries.tanggal}) = ${tahun}`;
    let dateFilterTrx = sql`YEAR(${transaksi.tanggal}) = ${tahun}`;
    
    if (bulan !== 'all') {
        dateFilterJurnal = and(dateFilterJurnal, sql`MONTH(${journalEntries.tanggal}) = ${parseInt(bulan)}`);
        dateFilterTrx = and(dateFilterTrx, sql`MONTH(${transaksi.tanggal}) = ${parseInt(bulan)}`);
    }

    const baseFilterJurnal = and(eq(journalEntries.unitId, unit.id), dateFilterJurnal);
    const baseFilterTrx = and(eq(transaksi.unitId, unit.id), dateFilterTrx);

    // ==========================================
    // 1. DATA DASHBOARD ANALISIS 
    // ==========================================

    const [summaryRow] = await db.select({
        totalMasuk:   sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
        totalKeluar:  sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
        totalHpp:     sql`COALESCE(SUM(${transaksi.hppTotal}), 0)`,
        jumlahTrx:    sql`COUNT(*)`,
    }).from(transaksi).where(baseFilterTrx);

    const arusKasPerBulan = await db.select({
        bulan:   sql`MONTH(${transaksi.tanggal})`,
        masuk:   sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
        keluar:  sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
    })
    .from(transaksi)
    .where(and(eq(transaksi.unitId, unit.id), sql`YEAR(${transaksi.tanggal}) = ${tahun}`))
    .groupBy(sql`MONTH(${transaksi.tanggal})`);

    const arusKas12Bulan = Array.from({ length: 12 }, (_, i) => {
        const bln = i + 1;
        const found = arusKasPerBulan.find(x => Number(x.bulan) === bln);
        return {
            bulan: bln,
            masuk: found ? Number(found.masuk) : 0,
            keluar: found ? Number(found.keluar) : 0
        };
    });

    const produkTerlaris = await db.select({
        productId:    transaksi.productId,
        namaProduk:   products.nama,
        totalRevenue: sql`COALESCE(SUM(${transaksi.nominal}), 0)`,
        totalQty:     sql`COALESCE(SUM(${transaksi.qty}), 0)`,
    })
    .from(transaksi)
    .leftJoin(products, eq(transaksi.productId, products.id))
    .where(and(baseFilterTrx, sql`${transaksi.productId} IS NOT NULL`))
    .groupBy(transaksi.productId, products.nama)
    .orderBy(desc(sql`SUM(${transaksi.nominal})`))
    .limit(5);

    const metodeBayarStats = await db.select({
        metode: transaksi.metodeBayar,
        total: sql`COALESCE(SUM(${transaksi.nominal}), 0)`
    })
    .from(transaksi)
    .where(and(baseFilterTrx, eq(transaksi.kategoriTrx, 'MASUK')))
    .groupBy(transaksi.metodeBayar);

    const riwayatTrx = await db.select()
        .from(transaksi)
        .where(baseFilterTrx)
        .orderBy(desc(transaksi.createdAt))
        .limit(10);

    const dashboard = {
        summary: {
            totalMasuk: Number(summaryRow?.totalMasuk || 0),
            totalKeluar: Number(summaryRow?.totalKeluar || 0),
            totalHpp: Number(summaryRow?.totalHpp || 0),
            jumlahTrx: Number(summaryRow?.jumlahTrx || 0),
            labaKotor: Number(summaryRow?.totalMasuk || 0) - Number(summaryRow?.totalHpp || 0)
        },
        arusKas: arusKas12Bulan,
        produkTerlaris,
        metodeBayarStats,
        riwayatTrx
    };

    // ==========================================
    // 2. DATA LAPORAN AKUNTANSI (DOUBLE-ENTRY)
    // ==========================================

    const balancesRaw = await db.select({
        coaId: chartOfAccounts.id,
        kodeAkun: chartOfAccounts.kodeAkun,
        namaAkun: chartOfAccounts.namaAkun,
        tipeAkun: chartOfAccounts.tipeAkun,
        normalBalance: chartOfAccounts.normalBalance,
        totalDebit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        totalKredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)`
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.coaId, chartOfAccounts.id))
    .where(baseFilterJurnal)
    .groupBy(chartOfAccounts.id, chartOfAccounts.kodeAkun, chartOfAccounts.namaAkun, chartOfAccounts.tipeAkun, chartOfAccounts.normalBalance);

    let labaRugi = {
        pendapatan: [], hpp: [], beban: [], pendapatanLainnya: [], bebanLainnya: [],
        totalPendapatan: 0, totalHpp: 0, totalBeban: 0, totalPendapatanLainnya: 0, totalBebanLainnya: 0,
        labaKotor: 0, labaBersih: 0
    };

    let neraca = {
        asetLancar: [], asetTetap: [], liabilitasLancar: [], liabilitasJangkaPanjang: [], ekuitas: [],
        totalAsetLancar: 0, totalAsetTetap: 0, totalAset: 0, totalLiabilitasLancar: 0, totalLiabilitasPanjang: 0, totalLiabilitas: 0, totalEkuitas: 0
    };

    balancesRaw.forEach(b => {
        const saldo = b.normalBalance === 'DEBIT' ? (Number(b.totalDebit) - Number(b.totalKredit)) : (Number(b.totalKredit) - Number(b.totalDebit));
        const data = { id: b.coaId, kodeAkun: b.kodeAkun, namaAkun: b.namaAkun, saldo };

        if (b.tipeAkun === 'PENDAPATAN') { labaRugi.pendapatan.push(data); labaRugi.totalPendapatan += saldo; }
        else if (b.tipeAkun === 'HPP') { labaRugi.hpp.push(data); labaRugi.totalHpp += saldo; }
        else if (b.tipeAkun === 'BEBAN_OPERASIONAL') { labaRugi.beban.push(data); labaRugi.totalBeban += saldo; }
        else if (b.tipeAkun === 'PENDAPATAN_LAINNYA') { labaRugi.pendapatanLainnya.push(data); labaRugi.totalPendapatanLainnya += saldo; }
        else if (b.tipeAkun === 'BEBAN_LAINNYA') { labaRugi.bebanLainnya.push(data); labaRugi.totalBebanLainnya += saldo; }
        
        else if (b.tipeAkun === 'ASET_LANCAR') { neraca.asetLancar.push(data); neraca.totalAsetLancar += saldo; }
        else if (b.tipeAkun === 'ASET_TETAP') { neraca.asetTetap.push(data); neraca.totalAsetTetap += saldo; }
        else if (b.tipeAkun === 'LIABILITAS_LANCAR') { neraca.liabilitasLancar.push(data); neraca.totalLiabilitasLancar += saldo; }
        else if (b.tipeAkun === 'LIABILITAS_JANGKA_PANJANG') { neraca.liabilitasJangkaPanjang.push(data); neraca.totalLiabilitasPanjang += saldo; }
        else if (b.tipeAkun === 'EKUITAS') { neraca.ekuitas.push(data); neraca.totalEkuitas += saldo; }
    });

    labaRugi.labaKotor = labaRugi.totalPendapatan - labaRugi.totalHpp;
    labaRugi.labaBersih = labaRugi.labaKotor - labaRugi.totalBeban + labaRugi.totalPendapatanLainnya - labaRugi.totalBebanLainnya;

    neraca.totalAset = neraca.totalAsetLancar + neraca.totalAsetTetap;
    neraca.totalLiabilitas = neraca.totalLiabilitasLancar + neraca.totalLiabilitasPanjang;
    neraca.totalEkuitas += labaRugi.labaBersih;

    return {
        unit, tahun, bulan,
        dashboard, labaRugi, neraca
    };
};
