import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, ecommerceOrders, ecommerceOrderItems, products } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';
import { inngest } from '$lib/server/inngest';

export const load = async ({ params, cookies, url, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    const statusFilter = url.searchParams.get('status') || 'all';
    const shippingFilter = url.searchParams.get('shipping') || 'all';
    depends('ecommerce:orders');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `ecommerce_orders:${unit.id}:${statusFilter}:${shippingFilter}`;
    const cached = await redis.get(cacheKey);
    if (cached) return { unit, ...cached, statusFilter, shippingFilter };

    // Cek tabel ada (sprint 2)
    const tableCheck = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ecommerce_orders'`
    );
    if (!Number(tableCheck[0]?.[0]?.cnt || 0)) {
        return { unit, orders: [], stats: {}, statusFilter, shippingFilter, migrationNeeded: true };
    }

    // Stats
    const [statsRows] = await Promise.all([
        db.select({
            totalOrders: sql`COUNT(*)`,
            totalRevenue: sql`COALESCE(SUM(total_amount), 0)`,
            pendingCount: sql`SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END)`,
            paidCount: sql`SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END)`,
        }).from(ecommerceOrders).where(eq(ecommerceOrders.unitId, unit.id))
    ]);

    // Orders dengan filter
    let orderQuery = db.select().from(ecommerceOrders)
        .where(eq(ecommerceOrders.unitId, unit.id))
        .orderBy(desc(ecommerceOrders.createdAt))
        .limit(100);

    let orders = await orderQuery;
    if (statusFilter !== 'all') orders = orders.filter(o => o.paymentStatus === statusFilter);
    if (shippingFilter !== 'all') orders = orders.filter(o => o.shippingStatus === shippingFilter);

    // Batch fetch items
    const orderIds = orders.map(o => o.id);
    let itemsMap = {};
    if (orderIds.length > 0) {
        const allItems = await db.select().from(ecommerceOrderItems)
            .where(sql`${ecommerceOrderItems.ecommerceOrderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
        for (const item of allItems) {
            if (!itemsMap[item.ecommerceOrderId]) itemsMap[item.ecommerceOrderId] = [];
            itemsMap[item.ecommerceOrderId].push(item);
        }
    }

    const ordersWithItems = orders.map(o => ({ ...o, items: itemsMap[o.id] || [] }));
    const stats = statsRows[0] || {};

    const result = { orders: ordersWithItems, stats };
    await redis.set(cacheKey, result, { ex: 60 });
    return { unit, ...result, statusFilter, shippingFilter, migrationNeeded: false };
};

export const actions = {
    updateShipping: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const orderId = Number(data.get('order_id'));
        const shippingStatus = String(data.get('shipping_status'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            await db.update(ecommerceOrders)
                .set({ shippingStatus })
                .where(and(eq(ecommerceOrders.id, orderId), eq(ecommerceOrders.unitId, unit.id)));

            // Invalidate + realtime
            const keys = await redis.keys(`ecommerce_orders:${unit.id}:*`);
            if (keys.length) await redis.del(...keys);
            pusherServer.trigger(`ecommerce-${slug}`, 'order-updated', { orderId, shippingStatus }).catch(() => {});

            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal update pengiriman' });
        }
    }
};
