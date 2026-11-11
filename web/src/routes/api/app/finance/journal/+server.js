import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts, transaksi } from '$lib/server/schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { pastikanPeriodeTerbuka } from '$lib/server/periodeTutup';
import { buatJurnalManual } from '$lib/server/jurnalManual';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });

    try {
        const tahun = url.searchParams.get('tahun');
        const bulan = url.searchParams.get('bulan');

        const conditions = [eq(journalEntries.unitId, Number(unitId))];

        if (tahun && bulan) {
            conditions.push(sql`YEAR(${journalEntries.tanggal}) = ${Number(tahun)}`);
            conditions.push(sql`MONTH(${journalEntries.tanggal}) = ${Number(bulan)}`);
        } else if (tahun) {
            conditions.push(sql`YEAR(${journalEntries.tanggal}) = ${Number(tahun)}`);
        } else if (bulan) {
            conditions.push(sql`MONTH(${journalEntries.tanggal}) = ${Number(bulan)}`);
        }

        const entries = await db.select().from(journalEntries)
            .where(and(...conditions))
            .orderBy(desc(journalEntries.tanggal), desc(journalEntries.id));

        // Baris jurnal + data akun (kode, nama, tipe) dalam satu query
        const idJurnal = entries.map((e) => e.id);
        const barisRaw = idJurnal.length === 0 ? [] : await db.select({
            id: journalEntryLines.id, journalId: journalEntryLines.journalId, coaId: journalEntryLines.coaId,
            keterangan: journalEntryLines.keterangan, debit: journalEntryLines.debit, kredit: journalEntryLines.kredit,
            contactId: journalEntryLines.contactId,
            kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun, normalBalance: chartOfAccounts.normalBalance
        }).from(journalEntryLines)
            .leftJoin(chartOfAccounts, eq(chartOfAccounts.id, journalEntryLines.coaId))
            .where(inArray(journalEntryLines.journalId, idJurnal))
            .orderBy(asc(journalEntryLines.id));
        const perJurnal = new Map();
        for (const l of barisRaw) {
            const baris = {
                id: l.id, journalId: l.journalId, coaId: l.coaId, keterangan: l.keterangan,
                debit: Number(l.debit || 0), kredit: Number(l.kredit || 0), contactId: l.contactId,
                account: l.kodeAkun ? { id: l.coaId, unitId: Number(unitId), kodeAkun: l.kodeAkun, namaAkun: l.namaAkun, tipeAkun: l.tipeAkun, normalBalance: l.normalBalance || 'DEBIT' } : null
            };
            if (!perJurnal.has(l.journalId)) perJurnal.set(l.journalId, []);
            perJurnal.get(l.journalId).push(baris);
        }

        const mappedData = entries.map(entry => {
            const lines = perJurnal.get(entry.id) || [];
            return {
                id: entry.id,
                unitId: entry.unitId,
                userId: entry.userId,
                tanggal: entry.tanggal,
                nomorJurnal: entry.nomorJurnal,
                referensi: entry.referensi,
                memo: entry.memo,
                status: entry.status,
                totalDebit: Number(entry.totalDebit || 0),
                totalKredit: Number(entry.totalKredit || 0),
                sourceType: entry.sourceType || 'MANUAL',
                sourceId: entry.sourceId,
                createdAt: entry.createdAt,
                lines,
                journalEntryLines: lines
            };
        });

        return json({
            success: true,
            message: 'Berhasil mengambil data jurnal',
            data: mappedData
        });
    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API GET Journal Error');
        else if (log?.error) log.error({ err }, 'API GET Journal Error');
        return json({ success: false, message: 'Gagal mengambil data jurnal: ' + pesanAman(err), data: null }, { status: 500 });
    }
}

export async function POST({ request, cookies, url }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const unitId = body.unitId ?? url.searchParams.get('unitId');
        const { tanggal, memo, referensi, lines } = body;

        if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });
        const createdEntry = await buatJurnalManual(db, { unitId: Number(unitId), userId, tanggal, memo, referensi, lines });

        return json({
            success: true,
            message: 'Manual journal entry berhasil dibuat',
            data: createdEntry
        });

    } catch (err) {
        if (err?.name === 'TransaksiError') return json({ success: false, message: pesanAman(err), data: null }, { status: err.status || 400 });
        if (log?.finance?.error) log.finance.error({ err }, 'API POST Journal Error');
        else if (log?.error) log.error({ err }, 'API POST Journal Error');
        return json({ success: false, message: 'Gagal membuat jurnal', data: null }, { status: 500 });
    }
}
