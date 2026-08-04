import { db } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import { getUserBySession } from '$lib/server/session';
import { ecommerceOrders, ecommerceOrderItems, unitBisnis } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, url }) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw error(401, 'Unauthorized');
    }
    const token = authHeader.slice(7);
    const user = await getUserBySession(token);
    if (!user) throw error(401, 'Invalid session');

    const unitId = url.searchParams.get('unitId');
    const paymentStatus = url.searchParams.get('paymentStatus');
    const shippingStatus = url.searchParams.get('shippingStatus');

    try {
        // Dapatkan unit yang dimiliki user
        const userUnits = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(eq(unitBisnis.ownerUserId, user.id));
        
        const unitIds = userUnits.map(u => u.id);
        if (unitIds.length === 0) {
            return json({ success: true, orders: [] });
        }

        let conditions = [inArray(ecommerceOrders.unitId, unitIds)];
        
        if (unitId) {
            const targetUnitId = parseInt(unitId);
            if (unitIds.includes(targetUnitId)) {
                conditions = [eq(ecommerceOrders.unitId, targetUnitId)];
            } else {
                throw error(403, 'Access denied to this unit');
            }
        }
        
        if (paymentStatus) {
            conditions.push(eq(ecommerceOrders.paymentStatus, paymentStatus));
        }
        if (shippingStatus) {
            conditions.push(eq(ecommerceOrders.shippingStatus, shippingStatus));
        }

        const orders = await db.select()
            .from(ecommerceOrders)
            .where(and(...conditions))
            .orderBy(desc(ecommerceOrders.createdAt))
            .limit(100);

        return json({ success: true, orders });
    } catch (e) {
        console.error('Get orders error:', e);
        throw error(500, 'Failed to fetch orders');
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw error(401, 'Unauthorized');
    }
    const token = authHeader.slice(7);
    const user = await getUserBySession(token);
    if (!user) throw error(401, 'Invalid session');

    const body = await request.json();
    const { 
        unitId, 
        customerName, 
        customerEmail, 
        customerPhone, 
        shippingAddress,
        items, // array of {productId, variantId, qty, price}
        subtotal,
        discountAmount = 0,
        totalAmount 
    } = body;

    if (!unitId || !customerName || !items || items.length === 0) {
        throw error(400, 'Missing required fields');
    }

    try {
        // Verify unit ownership
        const unit = await db.select()
            .from(unitBisnis)
            .where(and(
                eq(unitBisnis.id, parseInt(unitId)),
                eq(unitBisnis.ownerUserId, user.id)
            ))
            .limit(1);
        
        if (!unit || unit.length === 0) {
            throw error(403, 'Access denied to this unit');
        }

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Insert order
        const [orderResult] = await db.insert(ecommerceOrders).values({
            unitId: parseInt(unitId),
            orderNumber,
            customerName,
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
            shippingAddress: shippingAddress || '',
            subtotal: subtotal || 0,
            discountAmount: discountAmount || 0,
            totalAmount: totalAmount || 0,
            paymentStatus: 'PENDING',
            shippingStatus: 'PENDING',
            createdAt: new Date()
        });

        const orderId = orderResult.insertId;

        // Insert order items
        if (items && items.length > 0) {
            const orderItems = items.map(item => ({
                ecommerceOrderId: orderId,
                productId: item.productId || null,
                variantId: item.variantId || null,
                qty: item.qty || 1,
                price: item.price || 0,
                total: (item.qty || 1) * (item.price || 0)
            }));

            await db.insert(ecommerceOrderItems).values(orderItems);
        }

        return json({ 
            success: true, 
            orderId,
            orderNumber 
        });
    } catch (e) {
        console.error('Create order error:', e);
        throw error(500, 'Failed to create order');
    }
}
