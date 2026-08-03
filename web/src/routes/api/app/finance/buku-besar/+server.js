import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts } from '$lib/server/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/finance/buku-besar?unitId=X&coaId=Y&tahun=2026
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const coaId = url.searchParams.get('coaId');
    if (!unitId || !coaId) return json({ success: false, message: 'unitId dan coaId wajib' }, { status: 400 });

    try {
        const coa = await db.query.chartOfAccounts.findFirst({
            where: and(eq(chartOfAccounts.id, Number(coaId)), eq(chartOfAccounts.unitId, Number(unitId)))
        });
        if (!coa) return json({ success: false, message: 'COA tidak ditemukan' }, { status: 404 });

        // Get all journal entry lines for this COA
        const lines = await db.query.journalEntryLines.findMany({
            where: eq(journalEntryLines.coaId, Number(coaId)),
            orderBy: [asc(journalEntryLines.id)],
            with: { journal: true }
        });

        let saldo = 0;
        const entries = lines.map(l => {
            const debit = Number(l.debit || 0);
            const kredit = Number(l.kredit || 0);
            // Normal balance determines saldo direction
            if (coa.normalBalance === 'DEBIT') {
                saldo = saldo + debit - kredit;
            } else {
                saldo = saldo + kredit - debit;
            }
            return {
                tanggal: l.journal?.tanggal || '',
                nomorJurnal: l.journal?.nomorJurnal || '',
                keterangan: l.keterangan || l.journal?.memo || '',
                debit, kredit, saldo
            };
        });

        return json({
            success: true,
            data: {
                coa: { id: coa.id, kodeAkun: coa.kodeAkun, namaAkun: coa.namaAkun, tipeAkun: coa.tipeAkun },
                entries,
                saldoAwal: 0,
                saldoAkhir: saldo
            }
        });
    } catch (err) {
        log.api.error({ err }, 'GET finance/buku-besar');
        return json({ success: false, message: 'Gagal memuat buku besar' }, { status: 500 });
    }
}
