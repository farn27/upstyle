import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posCashTransactions, posShifts, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/pos/cash?shiftId=X — cash in/out untuk shift
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const shiftId = url.searchParams.get('shiftId');
    if (!shiftId) return json({ success: false, message: 'shiftId wajib' }, { status: 400 });

    try {
        const txns = await db.query.posCashTransactions.findMany({
            where: eq(posCashTransactions.shiftId, Number(shiftId)),
            orderBy: [desc(posCashTransactions.id)]
        });
        const data = txns.map(t => ({
            id: t.id, shiftId: t.shiftId, type: t.type,
            amount: Number(t.amount), description: t.description || '',
            createdAt: t.createdAt || ''
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET pos/cash');
        return json({ success: false, message: 'Gagal memuat kas' }, { status: 500 });
    }
}

// POST /api/app/pos/cash — cash in atau cash out dalam shift aktif
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        shiftId: z.coerce.number().int().positive(),
        type: z.enum(['CASH_IN','CASH_OUT']),
        amount: z.coerce.number().positive(),
        description: z.string().optional().default(''),
        unitId: z.coerce.number().int().positive()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input kas tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }
        const { shiftId, type, amount, description, unitId } = parsed.data;

        // Verify shift exists and is OPEN
        const shift = await db.query.posShifts.findFirst({ where: and(eq(posShifts.id, shiftId), eq(posShifts.status, 'OPEN')) });
        if (!shift) return json({ success: false, message: 'Shift tidak aktif atau tidak ditemukan' }, { status: 400 });

        await db.insert(posCashTransactions).values({
            shiftId, type, amount: String(amount), description
        });

        await db.insert(riwayatAksi).values({
            userId, unitId,
            pesan: `${type === 'CASH_IN' ? 'Kas Masuk' : 'Kas Keluar'}: Rp ${amount.toLocaleString('id-ID')} - ${description || '-'}`,
            kategori: 'POS', tipe: type === 'CASH_IN' ? 'success' : 'warning'
        });

        return json({ success: true, message: `${type === 'CASH_IN' ? 'Kas masuk' : 'Kas keluar'} berhasil dicatat` });
    } catch (err) {
        log.api.error({ err }, 'POST pos/cash');
        return json({ success: false, message: 'Gagal catat kas' }, { status: 500 });
    }
}
