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

        const entries = await db.query.journalEntries.findMany({
            where: and(...conditions),
            with: { journalEntryLines: true },
            orderBy: [desc(journalEntries.tanggal), desc(journalEntries.id)]
        });

        const mappedData = entries.map(entry => ({
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
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
            createdAt: entry.createdAt,
            journalEntryLines: (entry.journalEntryLines || entry.lines || []).map(line => ({
                id: line.id,
                journalId: line.journalId,
                coaId: line.coaId,
                keterangan: line.keterangan,
                debit: Number(line.debit || 0),
                kredit: Number(line.kredit || 0),
                contactId: line.contactId
            }))
        }));

        return json({
            success: true,
            message: 'Berhasil mengambil data jurnal',
            data: mappedData
        });
    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API GET Journal Error');
        else if (log?.error) log.error({ err }, 'API GET Journal Error');
        return json({ success: false, message: 'Gagal mengambil data jurnal: ' + err.message, data: null }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, tanggal, memo, referensi, lines } = body;

        if (!unitId || !tanggal || !Array.isArray(lines) || lines.length === 0) {
            return json({ success: false, message: 'Data input tidak lengkap (unitId, tanggal, lines wajib diisi)', data: null }, { status: 400 });
        }

        let totalDebit = 0;
        let totalKredit = 0;
        for (const line of lines) {
            totalDebit += Number(line.debit || 0);
            totalKredit += Number(line.kredit || 0);
        }

        if (Math.abs(totalDebit - totalKredit) > 0.001) {
            return json({
                success: false,
                message: `Total debit (${totalDebit}) dan total kredit (${totalKredit}) harus seimbang`,
                data: null
            }, { status: 400 });
        }

        if (totalDebit <= 0) {
            return json({ success: false, message: 'Nominal debit dan kredit harus lebih dari 0', data: null }, { status: 400 });
        }

        const dateObj = new Date(tanggal);
        const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();

        const countResult = await db.select({ count: sql`COUNT(*)` })
            .from(journalEntries)
            .where(and(
                eq(journalEntries.unitId, Number(unitId)),
                sql`YEAR(${journalEntries.tanggal}) = ${year}`
            ));

        const nextNum = (Number(countResult[0]?.count || 0) + 1).toString().padStart(4, '0');
        const nomorJurnal = `JRN-${year}-${nextNum}`;

        let createdEntry = null;

        await db.transaction(async (tx) => {
            const [result] = await tx.insert(journalEntries).values({
                unitId: Number(unitId),
                userId: userId,
                tanggal: tanggal,
                nomorJurnal: nomorJurnal,
                referensi: referensi || null,
                memo: memo || null,
                status: 'POSTED',
                totalDebit: String(totalDebit),
                totalKredit: String(totalKredit),
                sourceType: 'MANUAL',
                sourceId: null
            });

            const journalId = result.insertId;

            const lineInserts = lines.map(l => ({
                journalId: journalId,
                coaId: Number(l.coaId),
                keterangan: l.keterangan || memo || '',
                debit: String(Number(l.debit || 0)),
                kredit: String(Number(l.kredit || 0))
            }));

            if (lineInserts.length > 0) {
                await tx.insert(journalEntryLines).values(lineInserts);
            }

            createdEntry = {
                id: journalId,
                nomorJurnal,
                tanggal,
                totalDebit,
                totalKredit
            };
        });

        return json({
            success: true,
            message: 'Manual journal entry berhasil dibuat',
            data: createdEntry
        });

    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API POST Journal Error');
        else if (log?.error) log.error({ err }, 'API POST Journal Error');
        return json({ success: false, message: 'Gagal membuat jurnal: ' + err.message, data: null }, { status: 500 });
    }
}
