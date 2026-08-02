import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts, transaksi } from '$lib/server/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const coaId = url.searchParams.get('coaId');
    const tahun = url.searchParams.get('tahun');

    if (!unitId || !coaId) {
        return json({ success: false, message: 'unitId dan coaId wajib diisi', data: null }, { status: 400 });
    }

    try {
        const coa = await db.query.chartOfAccounts.findFirst({
            where: and(
                eq(chartOfAccounts.id, Number(coaId)),
                eq(chartOfAccounts.unitId, Number(unitId))
            )
        });

        if (!coa) {
            return json({ success: false, message: 'Akun COA tidak ditemukan', data: null }, { status: 404 });
        }

        const conditions = [
            eq(journalEntries.unitId, Number(unitId)),
            eq(journalEntryLines.coaId, Number(coaId))
        ];

        if (tahun) {
            conditions.push(sql`YEAR(${journalEntries.tanggal}) = ${Number(tahun)}`);
        }

        const lines = await db.select({
            id: journalEntryLines.id,
            tanggal: journalEntries.tanggal,
            nomorJurnal: journalEntries.nomorJurnal,
            keterangan: journalEntryLines.keterangan,
            debit: journalEntryLines.debit,
            kredit: journalEntryLines.kredit
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
        .where(and(...conditions))
        .orderBy(asc(journalEntries.tanggal), asc(journalEntries.id));

        let runningBalance = 0;
        const entries = lines.map(line => {
            const debit = Number(line.debit || 0);
            const kredit = Number(line.kredit || 0);

            if (coa.normalBalance === 'DEBIT') {
                runningBalance += debit - kredit;
            } else {
                runningBalance += kredit - debit;
            }

            return {
                tanggal: line.tanggal,
                nomorJurnal: line.nomorJurnal || '',
                keterangan: line.keterangan || '',
                debit: debit,
                kredit: kredit,
                saldo: runningBalance
            };
        });

        return json({
            success: true,
            message: 'Berhasil mengambil buku besar',
            data: {
                coa: {
                    id: coa.id,
                    unitId: coa.unitId,
                    kodeAkun: coa.kodeAkun,
                    namaAkun: coa.namaAkun,
                    tipeAkun: coa.tipeAkun,
                    normalBalance: coa.normalBalance,
                    isActive: coa.isActive,
                    deskripsi: coa.deskripsi
                },
                entries
            }
        });

    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API GET Buku Besar Error');
        else if (log?.error) log.error({ err }, 'API GET Buku Besar Error');
        return json({ success: false, message: 'Gagal mengambil buku besar: ' + err.message, data: null }, { status: 500 });
    }
}
