import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posReturns } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { prosesReturPos, ReturError } from '$lib/server/posRetur';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch pos returns for unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const returnsList = await db.query.posReturns.findMany({
            where: eq(posReturns.unitId, Number(unitId)),
            orderBy: [desc(posReturns.createdAt)],
            with: {
                items: true
            }
        });

        return json({
            success: true,
            message: "Berhasil mengambil data retur POS",
            data: returnsList
        });
    } catch (err) {
        log.pos.error({ err }, 'API GET POS RETURNS ERROR');
        return json({ success: false, message: "Gagal mengambil data retur" }, { status: 500 });
    }
}

// POST: Create a return — nominal refund & batas qty dihitung server (lihat $lib/server/posRetur)
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, orderId, reason, items } = body;

        if (!unitId || !orderId || !items || !Array.isArray(items) || items.length === 0) {
            return json({ success: false, message: "Data retur tidak lengkap" }, { status: 400 });
        }

        const result = await prosesReturPos(db, { unitId: Number(unitId), pemilikId: userId, handledBy: String(userId) }, {
            orderId,
            reason,
            items: items.map((/** @type {any} */ item) => ({
                orderItemId: item.orderItemId || item.order_item_id,
                productId: item.productId,
                qty: item.quantity ?? item.qtyReturned ?? 1
            }))
        });

        return json({
            success: true,
            message: "Retur POS berhasil dibuat",
            data: { returnId: result.returnId, returnNumber: result.returnNumber, totalRefund: result.totalRefund }
        });
    } catch (err) {
        if (err instanceof ReturError) return json({ success: false, message: err.message }, { status: err.status });
        log.pos.error({ err }, 'API POST POS RETURNS ERROR');
        return json({ success: false, message: "Gagal membuat retur POS" }, { status: 500 });
    }
}
