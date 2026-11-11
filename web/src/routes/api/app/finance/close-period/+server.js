import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { closingPeriods, transaksi, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/finance/close-period?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const periods = await db.query.closingPeriods.findMany({
            where: eq(closingPeriods.unitId, Number(unitId)),
            orderBy: [desc(closingPeriods.id)]
        });
        const data = periods.map(p => ({
            id: p.id, unitId: p.unitId, periodStart: p.periodStart, periodEnd: p.periodEnd,
            status: p.status, labaRugiPeriode: Number(p.labaRugiPeriode || 0),
            keterangan: p.keterangan || '', closedAt: p.closedAt || ''
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET finance/close-period');
        return json({ success: false, message: 'Gagal memuat periode tutup buku' }, { status: 500 });
    }
}

// POST /api/app/finance/close-period — tutup periode buku
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        unitId: z.coerce.number().int().positive(),
        periodStart: z.string().min(1), periodEnd: z.string().min(1),
        keterangan: z.string().optional()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) return json({ success: false, message: parsed.error.issues[0].message }, { status: 422 });
        const { unitId, periodStart, periodEnd, keterangan } = parsed.data;

        if (periodStart > periodEnd) return json({ success: false, message: 'Tanggal mulai tidak boleh setelah tanggal akhir' }, { status: 422 });

        // Tidak boleh tumpang tindih dengan periode lain yang sudah ditutup
        const tumpang = await db.query.closingPeriods.findFirst({ where: and(
            eq(closingPeriods.unitId, Number(unitId)), eq(closingPeriods.status, 'CLOSED'),
            sql`${closingPeriods.periodStart} <= ${periodEnd}`, sql`${closingPeriods.periodEnd} >= ${periodStart}`
        ) });
        if (tumpang) return json({ success: false, message: `Tumpang tindih dengan periode yang sudah ditutup (${String(tumpang.periodStart).slice(0, 10)} s/d ${String(tumpang.periodEnd).slice(0, 10)})` }, { status: 409 });

        // Laba/rugi HANYA untuk periode yang dikunci (bukan seluruh riwayat transaksi)
        const trxList = await db.select().from(transaksi).where(and(
            eq(transaksi.unitId, Number(unitId)),
            sql`DATE(${transaksi.tanggal}) >= ${periodStart}`,
            sql`DATE(${transaksi.tanggal}) <= ${periodEnd}`
        ));
        const totalMasuk = trxList.filter(t => t.kategoriTrx === 'MASUK').reduce((s, t) => s + Number(t.nominal || 0), 0);
        const totalKeluar = trxList.filter(t => t.kategoriTrx === 'KELUAR').reduce((s, t) => s + Number(t.nominal || 0), 0);
        const labaRugi = totalMasuk - totalKeluar;

        const [result] = await db.insert(closingPeriods).values({
            unitId: Number(unitId), userId, periodStart, periodEnd,
            status: 'CLOSED', labaRugiPeriode: String(labaRugi),
            keterangan: keterangan || null, closedAt: new Date()
        });

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Tutup Buku: Periode ${periodStart} s/d ${periodEnd}. Laba/Rugi: Rp ${labaRugi.toLocaleString('id-ID')}`,
            kategori: 'FINANCE', tipe: labaRugi >= 0 ? 'success' : 'info'
        });

        return json({ success: true, message: 'Periode berhasil ditutup', data: { id: result.insertId, labaRugi } });
    } catch (err) {
        log.api.error({ err }, 'POST finance/close-period');
        return json({ success: false, message: 'Gagal tutup periode' }, { status: 500 });
    }
}

// DELETE /api/app/finance/close-period?id=X&unitId=Y — buka kembali periode (hapus kunci)
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const id = Number(url.searchParams.get('id'));
    const unitId = Number(url.searchParams.get('unitId'));
    if (!id || !unitId) return json({ success: false, message: 'id dan unitId wajib diisi' }, { status: 400 });
    try {
        const p = await db.query.closingPeriods.findFirst({ where: and(eq(closingPeriods.id, id), eq(closingPeriods.unitId, unitId)) });
        if (!p) return json({ success: false, message: 'Periode tidak ditemukan' }, { status: 404 });
        await db.delete(closingPeriods).where(eq(closingPeriods.id, id));
        await db.insert(riwayatAksi).values({
            userId, unitId, pesan: `Buka Kembali Periode: ${String(p.periodStart).slice(0, 10)} s/d ${String(p.periodEnd).slice(0, 10)}`,
            kategori: 'FINANCE', tipe: 'info'
        });
        return json({ success: true, message: 'Periode dibuka kembali' });
    } catch (err) {
        log.api.error({ err }, 'DELETE finance/close-period');
        return json({ success: false, message: 'Gagal membuka periode' }, { status: 500 });
    }
}
