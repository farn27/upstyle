import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ecommerceOrders, ecommerceOrderItems, unitBisnis } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { log } from '$lib/server/logger';

// GET /api/app/orders?unitId=X&page=1&limit=20
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
    const offset = (page - 1) * limit;

    try {
        const userUnits = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(eq(unitBisnis.userId, userId));

        const unitIds = userUnits.map(u => u.id);
        if (unitIds.length === 0) {
            return json({ success: true, data: [], total: 0, page, limit });
        }

        let whereClause;
        if (unitId) {
            const targetId = parseInt(unitId);
            if (!unitIds.includes(targetId)) {
                return json({ success: false, message: 'Access denied' }, { status: 403 });
            }
            whereClause = eq(ecommerceOrders.unitId, targetId);
        } else {
            whereClause = inArray(ecommerceOrders.unitId, unitIds);
        }

        const orders = await db.select()
            .from(ecommerceOrders)
            .where(whereClause)
            .orderBy(desc(ecommerceOrders.createdAt))
            .limit(limit)
            .offset(offset);

        return json({ success: true, data: orders, page, limit });
    } catch (err) {
        log.api.error({ err }, 'GET orders');
        return json({ success: false, message: 'Gagal memuat pesanan' }, { status: 500 });
    }
}

// POST /api/app/orders  — create new order
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
        unitId,
        customerName,
        customerEmail = '',
        customerPhone = '',
        shippingAddress = '',
        items = [],
        subtotal = 0,
        discountAmount = 0,
        totalAmount = 0
    } = body;

    if (!unitId || !customerName || items.length === 0) {
        return json({ success: false, message: 'unitId, customerName, dan items wajib diisi' }, { status: 400 });
    }

    try {
        // Verify unit ownership
        const [unit] = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(and(eq(unitBisnis.id, parseInt(unitId)), eq(unitBisnis.userId, userId)))
            .limit(1);

        if (!unit) return json({ success: false, message: 'Access denied' }, { status: 403 });

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const [orderResult] = await db.insert(ecommerceOrders).values({
            unitId: parseInt(unitId),
            orderNumber,
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress,
            subtotal,
            discountAmount,
            totalAmount,
            paymentStatus: 'PENDING',
            shippingStatus: 'PENDING',
            createdAt: new Date()
        });

        const orderId = orderResult.insertId;

        if (items.length > 0) {
            await db.insert(ecommerceOrderItems).values(
                items.map(item => ({
                    ecommerceOrderId: orderId,
                    productId: item.productId || null,
                    variantId: item.variantId || null,
                    qty: item.qty || 1,
                    price: item.price || 0,
                    total: (item.qty || 1) * (item.price || 0)
                }))
            );
        }

        return json({ success: true, data: { orderId, orderNumber } });
    } catch (err) {
        log.api.error({ err }, 'POST orders');
        return json({ success: false, message: 'Gagal membuat pesanan' }, { status: 500 });
    }
}
