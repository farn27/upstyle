import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { budgetItems, chartOfAccounts, riwayatAksi, journalEntries, journalEntryLines } from '$lib/server/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { hapusBudget, MasterDataError } from '$lib/server/masterData';
import { z } from 'zod';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    // app lama mengirim ?year=, web/app baru ?tahun=
    const tahun = Number(url.searchParams.get('tahun') || url.searchParams.get('year') || new Date().getFullYear());
    try {
        const items = await db.select({
            id: budgetItems.id, unitId: budgetItems.unitId, tahun: budgetItems.tahun, bulan: budgetItems.bulan,
            nominal: budgetItems.nominal, keterangan: budgetItems.keterangan, coaId: budgetItems.coaId,
            namaAkun: chartOfAccounts.namaAkun, kodeAkun: chartOfAccounts.kodeAkun, tipeAkun: chartOfAccounts.tipeAkun
        }).from(budgetItems)
            .leftJoin(chartOfAccounts, eq(chartOfAccounts.id, budgetItems.coaId))
            .where(and(eq(budgetItems.unitId, Number(unitId)), eq(budgetItems.tahun, tahun)))
            .orderBy(asc(budgetItems.bulan), asc(chartOfAccounts.kodeAkun));

        // Realisasi per akun per bulan dari jurnal (pendapatan: kredit-debit, lainnya: debit-kredit)
        const mutasi = await db.select({
            coaId: journalEntryLines.coaId,
            bulan: sql`MONTH(${journalEntries.tanggal})`,
            debit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
            kredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)`
        }).from(journalEntryLines)
            .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
            .where(and(eq(journalEntries.unitId, Number(unitId)), sql`YEAR(${journalEntries.tanggal}) = ${tahun}`))
            .groupBy(journalEntryLines.coaId, sql`MONTH(${journalEntries.tanggal})`);
        const perAkun = new Map();
        for (const m of mutasi) {
            const k = `${m.coaId}:${Number(m.bulan)}`;
            perAkun.set(k, { debit: Number(m.debit), kredit: Number(m.kredit) });
        }

        const data = items.map(b => {
            const pendapatan = ['PENDAPATAN', 'PENDAPATAN_LAINNYA'].includes(b.tipeAkun || '');
            const bulanBulan = b.bulan === 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [b.bulan];
            let debit = 0, kredit = 0;
            for (const bl of bulanBulan) { const m = perAkun.get(`${b.coaId}:${bl}`); if (m) { debit += m.debit; kredit += m.kredit; } }
            const realisasi = pendapatan ? kredit - debit : debit - kredit;
            const nominal = Number(b.nominal);
            return {
                id: b.id, unitId: b.unitId, tahun: b.tahun, bulan: b.bulan,
                nominal, keterangan: b.keterangan || '',
                coaId: b.coaId, namaAkun: b.namaAkun || '', kodeAkun: b.kodeAkun || '', tipeAkun: b.tipeAkun || '',
                realisasi, progress: nominal > 0 ? Math.round(Math.min((realisasi / nominal) * 100, 999)) : 0,
                selisih: nominal - realisasi, melebihi: !pendapatan && realisasi > nominal, pendapatan
            };
        });
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET finance/budget');
        return json({ success: false, message: 'Gagal memuat anggaran' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const schema = z.object({
        coaId: z.coerce.number().int().positive(), tahun: z.coerce.number().int(),
        bulan: z.coerce.number().int().min(0).max(12), nominal: z.coerce.number().positive(),
        keterangan: z.string().optional(), unitId: z.coerce.number().int().positive()
    });
    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });
        const { coaId, tahun, bulan, nominal, keterangan, unitId } = parsed.data;
        const akun = await db.query.chartOfAccounts.findFirst({ where: and(eq(chartOfAccounts.id, coaId), eq(chartOfAccounts.unitId, Number(unitId))) });
        if (!akun) return json({ success: false, message: 'Akun tidak ditemukan di unit ini' }, { status: 400 });
        const ada = await db.query.budgetItems.findFirst({ where: and(eq(budgetItems.unitId, Number(unitId)), eq(budgetItems.coaId, coaId), eq(budgetItems.tahun, tahun), eq(budgetItems.bulan, bulan)) });
        if (ada) return json({ success: false, message: 'Anggaran untuk akun dan periode ini sudah ada — ubah yang lama.' }, { status: 409 });
        const [result] = await db.insert(budgetItems).values({
            unitId: Number(unitId), coaId, tahun, bulan, nominal: String(nominal), keterangan: keterangan || null
        });
        await db.insert(riwayatAksi).values({ userId, unitId: Number(unitId), pesan: `Anggaran baru: Rp ${nominal.toLocaleString('id-ID')} untuk ${tahun}/${bulan}`, kategori: 'FINANCE', tipe: 'info' });
        return json({ success: true, message: 'Anggaran berhasil ditambahkan', data: { id: result.insertId } });
    } catch (err) {
        log.api.error({ err }, 'POST finance/budget');
        return json({ success: false, message: 'Gagal tambah anggaran' }, { status: 500 });
    }
}

// DELETE: hapus anggaran — ?id=X&unitId=Y
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const id = Number(url.searchParams.get('id'));
    const unitId = Number(url.searchParams.get('unitId'));
    if (!id || !unitId) return json({ success: false, message: 'id dan unitId wajib diisi' }, { status: 400 });
    try {
        await hapusBudget(db, unitId, id);
        await db.insert(riwayatAksi).values({ userId, unitId, pesan: 'Anggaran dihapus', kategori: 'FINANCE', tipe: 'info' });
        return json({ success: true, message: 'Anggaran berhasil dihapus' });
    } catch (err) {
        if (err instanceof MasterDataError) return json({ success: false, message: err.message }, { status: err.status });
        log.api.error({ err }, 'DELETE budget/+server.js');
        return json({ success: false, message: 'Gagal menghapus anggaran' }, { status: 500 });
    }
}

// PUT: ubah nominal / keterangan anggaran — body { id, unitId, nominal, keterangan? }
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const parsed = z.object({
            id: z.coerce.number().int().positive(), unitId: z.coerce.number().int().positive(),
            nominal: z.coerce.number().positive('Nominal harus lebih dari 0'), keterangan: z.string().max(255).nullable().optional()
        }).safeParse(body);
        if (!parsed.success) return json({ success: false, message: parsed.error.issues?.[0]?.message || 'Input tidak valid' }, { status: 422 });
        const { id, unitId, nominal, keterangan } = parsed.data;
        const [r] = await db.update(budgetItems).set({ nominal: String(nominal), keterangan: keterangan ?? null })
            .where(and(eq(budgetItems.id, id), eq(budgetItems.unitId, unitId)));
        if (!r?.affectedRows) return json({ success: false, message: 'Anggaran tidak ditemukan' }, { status: 404 });
        return json({ success: true, message: 'Anggaran diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT finance/budget');
        return json({ success: false, message: 'Gagal mengubah anggaran' }, { status: 500 });
    }
}
