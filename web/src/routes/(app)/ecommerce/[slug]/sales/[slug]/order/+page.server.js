import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, salesOrders, salesOrderItems, crmContacts } from '$lib/server/schema';
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

    depends('sales:orders');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `sales_orders:${unit.id}:${statusFilter}`;

    try {
        // Redis cache — TTL 2 menit (data sales harus relatif fresh)
        const cached = await redis.get(cacheKey);
        if (cached) return { unit, orders: cached, statusFilter };

        // Cek tabel sudah ada (sprint 2 migration mungkin belum jalan)
        const tableExists = await db.execute(
            sql`SELECT COUNT(*) as cnt FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_orders'`
        );
        if (!Number(tableExists[0]?.[0]?.cnt || tableExists[0]?.cnt || 0)) {
            return { unit, orders: [], statusFilter, migrationNeeded: true };
        }

        // Drizzle query dengan JOIN — tidak ada N+1
        let query = db
            .select({
                id: salesOrders.id,
                orderNumber: salesOrders.orderNumber,
                totalAmount: salesOrders.totalAmount,
                status: salesOrders.status,
                notes: salesOrders.notes,
                createdAt: salesOrders.createdAt,
                customerNama: crmContacts.nama,
                customerId: salesOrders.customerId
            })
            .from(salesOrders)
            .leftJoin(crmContacts, eq(crmContacts.id, salesOrders.customerId))
            .where(eq(salesOrders.unitId, unit.id))
            .orderBy(desc(salesOrders.createdAt))
            .limit(100);

        const orderRows = await (statusFilter !== 'all'
            ? db.select({
                id: salesOrders.id,
                orderNumber: salesOrders.orderNumber,
                totalAmount: salesOrders.totalAmount,
                status: salesOrders.status,
                notes: salesOrders.notes,
                createdAt: salesOrders.createdAt,
                customerNama: crmContacts.nama,
                customerId: salesOrders.customerId
              })
              .from(salesOrders)
              .leftJoin(crmContacts, eq(crmContacts.id, salesOrders.customerId))
              .where(and(eq(salesOrders.unitId, unit.id), eq(salesOrders.status, statusFilter)))
              .orderBy(desc(salesOrders.createdAt))
              .limit(100)
            : query);

        // Batch fetch items untuk semua orders sekaligus — no N+1
        const orderIds = orderRows.map(o => o.id);
        let itemsMap = {};
        if (orderIds.length > 0) {
            const allItems = await db
                .select()
                .from(salesOrderItems)
                .where(sql`${salesOrderItems.salesOrderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
            for (const item of allItems) {
                if (!itemsMap[item.salesOrderId]) itemsMap[item.salesOrderId] = [];
                itemsMap[item.salesOrderId].push(item);
            }
        }

        const orders = orderRows.map(o => ({
            ...o,
            customer: o.customerNama ? { nama: o.customerNama } : null,
            items: itemsMap[o.id] || []
        }));

        // Cache 2 menit
        await redis.set(cacheKey, orders, { ex: 120 });

        return { unit, orders, statusFilter, migrationNeeded: false };
    } catch (err) {
        console.error('[Sales Order load]', err.message);
        return { unit, orders: [], statusFilter, migrationNeeded: true };
    }
};

export const actions = {
    updateStatus: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const orderId = Number(data.get('order_id'));
        const newStatus = String(data.get('status'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            await db.update(salesOrders)
                .set({ status: newStatus })
                .where(and(eq(salesOrders.id, orderId), eq(salesOrders.unitId, unit.id)));

            // Invalidate Redis cache
            const keys = await redis.keys(`sales_orders:${unit.id}:*`);
            if (keys.length > 0) await redis.del(...keys);

            // Pusher realtime update
            pusherServer.trigger(`sales-${slug}`, 'order-updated', {
                orderId, status: newStatus
            }).catch(() => {});

            // Inngest background event
            await inngest.send({
                name: 'sales/order.status.changed',
                data: { userId, unitId: unit.id, orderId, status: newStatus, slug }
            });

            return { success: true };
        } catch (err) {
            console.error('[Sales Order updateStatus]', err);
            return fail(500, { error: 'Gagal update status' });
        }
    }
};
