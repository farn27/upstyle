import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { taxRates, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    try {
        const rates = await db.query.taxRates.findMany({
            where: and(eq(taxRates.unitId, Number(unitId)), eq(taxRates.isActive, 1)),
            orderBy: [desc(taxRates.id)]
        });
        const data = rates.map(r => ({
            id: r.id, unitId: r.unitId, namaPajak: r.namaPajak,
            persentase: Number(r.persentase), tipe: r.tipe, isDefault: r.isDefault || 0
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET finance/tax-rates');
        return json({ success: false, message: 'Gagal memuat pajak' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const schema = z.object({
        namaPajak: z.string().min(1), persentase: z.coerce.number().min(0).max(100),
        tipe: z.enum(['PPN','PPH','LAINNYA']).default('PPN'),
        isDefault: z.coerce.number().optional().default(0),
        unitId: z.coerce.number().int().positive()
    });
    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });
        const { namaPajak, persentase, tipe, isDefault, unitId } = parsed.data;
        const [result] = await db.insert(taxRates).values({
            unitId: Number(unitId), namaPajak, persentase: String(persentase),
            tipe, isDefault: isDefault || 0, isActive: 1
        });
        await db.insert(riwayatAksi).values({ userId, unitId: Number(unitId), pesan: `Pajak baru: ${namaPajak} (${persentase}%)`, kategori: 'FINANCE', tipe: 'success' });
        return json({ success: true, message: 'Pajak berhasil ditambahkan', data: { id: result.insertId } });
    } catch (err) {
        log.api.error({ err }, 'POST finance/tax-rates');
        return json({ success: false, message: 'Gagal tambah pajak' }, { status: 500 });
    }
}
