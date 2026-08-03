import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { vouchers, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/pos/vouchers?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const list = await db.query.vouchers.findMany({
            where: eq(vouchers.unitId, Number(unitId)),
            orderBy: [desc(vouchers.id)]
        });
        const data = list.map(v => ({
            id: v.id, unitId: v.unitId, code: v.code,
            discountType: v.discountType, discountValue: Number(v.discountValue),
            maxUsage: v.maxUsage || 0, currentUsage: v.currentUsage || 0,
            minPurchase: Number(v.minPurchase || 0),
            validFrom: v.validFrom, validUntil: v.validUntil,
            isActive: v.isActive ? 1 : 0
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET pos/vouchers');
        return json({ success: false, message: 'Gagal memuat voucher' }, { status: 500 });
    }
}

// POST /api/app/pos/vouchers — buat voucher baru
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        code: z.string().min(3).max(50).toUpperCase(),
        discountType: z.enum(['PERCENTAGE','FIXED']),
        discountValue: z.coerce.number().positive(),
        maxUsage: z.coerce.number().int().min(0).default(0),
        minPurchase: z.coerce.number().min(0).default(0),
        validFrom: z.string().min(1),
        validUntil: z.string().min(1),
        unitId: z.coerce.number().int().positive()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.voucher || body);
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });
        const { code, discountType, discountValue, maxUsage, minPurchase, validFrom, validUntil, unitId } = parsed.data;

        // Check unique code
        const existing = await db.query.vouchers.findFirst({ where: and(eq(vouchers.unitId, Number(unitId)), eq(vouchers.code, code)) });
        if (existing) return json({ success: false, message: `Kode voucher "${code}" sudah digunakan` }, { status: 409 });

        const [result] = await db.insert(vouchers).values({
            unitId: Number(unitId), code, discountType,
            discountValue: String(discountValue), maxUsage, currentUsage: 0,
            minPurchase: String(minPurchase), validFrom, validUntil, isActive: true
        });

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Voucher baru: ${code} (${discountType === 'PERCENTAGE' ? discountValue + '%' : 'Rp ' + discountValue.toLocaleString('id-ID')})`,
            kategori: 'POS', tipe: 'success'
        });

        return json({ success: true, message: 'Voucher berhasil dibuat', data: { id: result.insertId, code } });
    } catch (err) {
        log.api.error({ err }, 'POST pos/vouchers');
        return json({ success: false, message: 'Gagal buat voucher' }, { status: 500 });
    }
}

// DELETE /api/app/pos/vouchers?voucherId=X
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const voucherId = url.searchParams.get('voucherId');
    if (!voucherId) return json({ success: false, message: 'voucherId wajib' }, { status: 400 });
    try {
        await db.update(vouchers).set({ isActive: false }).where(eq(vouchers.id, Number(voucherId)));
        return json({ success: true, message: 'Voucher dinonaktifkan' });
    } catch (err) {
        log.api.error({ err }, 'DELETE pos/vouchers');
        return json({ success: false, message: 'Gagal hapus voucher' }, { status: 500 });
    }
}
