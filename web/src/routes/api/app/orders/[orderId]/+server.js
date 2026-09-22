import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ecommerceOrders, ecommerceOrderItems, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { log } from '$lib/server/logger';

// GET /api/app/orders/:orderId
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const orderId = parseInt(params.orderId);
    if (!orderId) return json({ success: false, message: 'orderId tidak valid' }, { status: 400 });

    try {
        const [order] = await db.select({
                order: ecommerceOrders,
                unitOwnerId: unitBisnis.userId
            })
            .from(ecommerceOrders)
            .innerJoin(unitBisnis, eq(ecommerceOrders.unitId, unitBisnis.id))
            .where(eq(ecommerceOrders.id, orderId))
            .limit(1);

        if (!order) return json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
        if (order.unitOwnerId !== userId) return json({ success: false, message: 'Access denied' }, { status: 403 });

        const items = await db.select()
            .from(ecommerceOrderItems)
            .where(eq(ecommerceOrderItems.ecommerceOrderId, orderId));

        return json({ success: true, data: { ...order.order, items } });
    } catch (err) {
        log.api.error({ err }, 'GET order detail');
        return json({ success: false, message: 'Gagal memuat detail pesanan' }, { status: 500 });
    }
}

// PUT /api/app/orders/:orderId  — update status
export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const orderId = parseInt(params.orderId);
    if (!orderId) return json({ success: false, message: 'orderId tidak valid' }, { status: 400 });

    const body = await request.json();
    const { status, paymentStatus, shippingStatus } = body;

    try {
        // Verify ownership
        const [order] = await db.select({
                id: ecommerceOrders.id,
                unitOwnerId: unitBisnis.userId
            })
            .from(ecommerceOrders)
            .innerJoin(unitBisnis, eq(ecommerceOrders.unitId, unitBisnis.id))
            .where(eq(ecommerceOrders.id, orderId))
            .limit(1);

        if (!order) return json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
        if (order.unitOwnerId !== userId) return json({ success: false, message: 'Access denied' }, { status: 403 });

        const updates = {};
        if (status) { updates.paymentStatus = status; updates.shippingStatus = status; }
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (shippingStatus) updates.shippingStatus = shippingStatus;

        if (Object.keys(updates).length === 0) {
            return json({ success: false, message: 'Tidak ada field untuk diupdate' }, { status: 400 });
        }

        await db.update(ecommerceOrders).set(updates).where(eq(ecommerceOrders.id, orderId));

        return json({ success: true, message: 'Status pesanan diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT order status');
        return json({ success: false, message: 'Gagal update pesanan' }, { status: 500 });
    }
}
