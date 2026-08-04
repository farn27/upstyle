import { db } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import { getUserBySession } from '$lib/server/session';
import { ecommerceOrders, ecommerceOrderItems, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params }) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw error(401, 'Unauthorized');
    }
    const token = authHeader.slice(7);
    const user = await getUserBySession(token);
    if (!user) throw error(401, 'Invalid session');

    const orderId = parseInt(params.orderId);

    try {
        // Get order with unit verification
        const [order] = await db.select()
            .from(ecommerceOrders)
            .innerJoin(unitBisnis, eq(ecommerceOrders.unitId, unitBisnis.id))
            .where(and(
                eq(ecommerceOrders.id, orderId),
                eq(unitBisnis.ownerUserId, user.id)
            ))
            .limit(1);

        if (!order) {
            throw error(404, 'Order not found');
        }

        // Get order items
        const items = await db.select()
            .from(ecommerceOrderItems)
            .where(eq(ecommerceOrderItems.ecommerceOrderId, orderId));

        return json({ 
            success: true, 
            order: order.ecommerce_orders,
            items 
        });
    } catch (e) {
        console.error('Get order detail error:', e);
        throw error(500, 'Failed to fetch order detail');
    }
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request, params }) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw error(401, 'Unauthorized');
    }
    const token = authHeader.slice(7);
    const user = await getUserBySession(token);
    if (!user) throw error(401, 'Invalid session');

    const orderId = parseInt(params.orderId);
    const body = await request.json();
    const { paymentStatus, shippingStatus, transactionId } = body;

    try {
        // Verify ownership
        const [order] = await db.select()
            .from(ecommerceOrders)
            .innerJoin(unitBisnis, eq(ecommerceOrders.unitId, unitBisnis.id))
            .where(and(
                eq(ecommerceOrders.id, orderId),
                eq(unitBisnis.ownerUserId, user.id)
            ))
            .limit(1);

        if (!order) {
            throw error(404, 'Order not found');
        }

        // Update order
        const updates = {};
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (shippingStatus) updates.shippingStatus = shippingStatus;
        if (transactionId) updates.transactionId = transactionId;

        if (Object.keys(updates).length === 0) {
            throw error(400, 'No fields to update');
        }

        await db.update(ecommerceOrders)
            .set(updates)
            .where(eq(ecommerceOrders.id, orderId));

        return json({ success: true, message: 'Order updated' });
    } catch (e) {
        console.error('Update order error:', e);
        throw error(500, 'Failed to update order');
    }
}
