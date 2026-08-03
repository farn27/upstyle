import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { budgetItems, chartOfAccounts, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    const tahun = url.searchParams.get('tahun') || new Date().getFullYear();
    try {
        const items = await db.query.budgetItems.findMany({
            where: and(eq(budgetItems.unitId, Number(unitId)), eq(budgetItems.tahun, Number(tahun))),
            orderBy: [desc(budgetItems.id)],
            with: { coa: true }
        });
        const data = items.map(b => ({
            id: b.id, unitId: b.unitId, tahun: b.tahun, bulan: b.bulan,
            nominal: Number(b.nominal), keterangan: b.keterangan || '',
            coaId: b.coaId, namaAkun: b.coa?.namaAkun || '', kodeAkun: b.coa?.kodeAkun || ''
        }));
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
