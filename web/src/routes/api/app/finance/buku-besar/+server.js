import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts } from '$lib/server/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/finance/buku-besar?unitId=X&coaId=Y[&tahun=2026][&bulan=1..12]
// Mutasi satu akun per periode, urut tanggal; saldoAwal = akumulasi seluruh jurnal sebelum periode (sama dengan web).
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const coaId = url.searchParams.get('coaId');
    if (!unitId || !coaId) return json({ success: false, message: 'unitId dan coaId wajib' }, { status: 400 });

    const tahun = Number(url.searchParams.get('tahun') || 0);
    const bulan = Number(url.searchParams.get('bulan') || 0);

    try {
        const coa = await db.query.chartOfAccounts.findFirst({
            where: and(eq(chartOfAccounts.id, Number(coaId)), eq(chartOfAccounts.unitId, Number(unitId)))
        });
        if (!coa) return json({ success: false, message: 'COA tidak ditemukan' }, { status: 404 });

        const debitNormal = coa.normalBalance === 'DEBIT';
        const arah = (d, k) => (debitNormal ? d - k : k - d);

        const dasar = [eq(journalEntries.unitId, Number(unitId)), eq(journalEntryLines.coaId, Number(coaId))];
        const periode = [];
        if (tahun) periode.push(sql`YEAR(${journalEntries.tanggal}) = ${tahun}`);
        if (tahun && bulan) periode.push(sql`MONTH(${journalEntries.tanggal}) = ${bulan}`);

        // Saldo awal: semua jurnal sebelum periode yang dipilih
        let saldoAwal = 0;
        if (tahun) {
            const sebelum = bulan
                ? sql`(YEAR(${journalEntries.tanggal}) < ${tahun} OR (YEAR(${journalEntries.tanggal}) = ${tahun} AND MONTH(${journalEntries.tanggal}) < ${bulan}))`
                : sql`YEAR(${journalEntries.tanggal}) < ${tahun}`;
            const [awal] = await db.select({
                debit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
                kredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)`
            }).from(journalEntryLines)
                .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
                .where(and(...dasar, sql`${sebelum}`));
            saldoAwal = arah(Number(awal?.debit || 0), Number(awal?.kredit || 0));
        }

        const baris = await db.select({
            tanggal: journalEntries.tanggal,
            nomorJurnal: journalEntries.nomorJurnal,
            referensi: journalEntries.referensi,
            memo: journalEntries.memo,
            sumber: journalEntries.sourceType,
            keterangan: journalEntryLines.keterangan,
            debit: journalEntryLines.debit,
            kredit: journalEntryLines.kredit
        }).from(journalEntryLines)
            .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
            .where(and(...dasar, ...periode))
            .orderBy(asc(journalEntries.tanggal), asc(journalEntries.id), asc(journalEntryLines.id));

        let saldo = saldoAwal;
        let totalDebit = 0;
        let totalKredit = 0;
        const entries = baris.map((l) => {
            const debit = Number(l.debit || 0);
            const kredit = Number(l.kredit || 0);
            saldo += arah(debit, kredit);
            totalDebit += debit;
            totalKredit += kredit;
            return {
                tanggal: String(l.tanggal || ''),
                nomorJurnal: l.nomorJurnal || '',
                referensi: l.referensi || null,
                sumber: l.sumber || 'MANUAL',
                keterangan: l.keterangan || l.memo || '',
                debit, kredit, saldo
            };
        });

        return json({
            success: true,
            data: {
                coa: { id: coa.id, kodeAkun: coa.kodeAkun, namaAkun: coa.namaAkun, tipeAkun: coa.tipeAkun, normalBalance: coa.normalBalance },
                entries,
                saldoAwal,
                totalDebit,
                totalKredit,
                saldoAkhir: saldo
            }
        });
    } catch (err) {
        log?.error?.({ err }, 'GET finance/buku-besar');
        return json({ success: false, message: 'Gagal memuat buku besar' }, { status: 500 });
    }
}
