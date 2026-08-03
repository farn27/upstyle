import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { closingPeriods, transaksi, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
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
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });
        const { unitId, periodStart, periodEnd, keterangan } = parsed.data;

        // Calculate laba/rugi for the period
        const trxList = await db.query.transaksi.findMany({ where: eq(transaksi.unitId, Number(unitId)) });
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
