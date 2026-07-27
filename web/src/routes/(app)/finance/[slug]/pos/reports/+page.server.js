import { db } from '$lib/server/drizzle';
import { posOrders, posCustomers, posOrderItems } from '$lib/server/schema';
import { eq, and, sql, inArray, desc, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { resolvePosUnitAccess } from '$lib/server/posAuth';

export async function load({ params, cookies, locals }) {
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);
    const unitId = unit.id;

    try {
        const statsRows = await db.select({
            total_sales: sql`COALESCE(SUM(${posOrders.total}), 0)`,
            total_orders: sql`COUNT(*)`,
            average_ticket: sql`COALESCE(AVG(${posOrders.total}), 0)`
        })
        .from(posOrders)
        .where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID')));

        const recentRows = await db.select({
            id: posOrders.id,
            order_number: posOrders.orderNumber,
            tanggal: posOrders.createdAt,
            total: posOrders.total,
            status: posOrders.status,
            payment_method: posOrders.paymentMethod,
            notes: posOrders.notes,
            customer_name: sql`COALESCE(${posCustomers.namaCustomer}, 'Pelanggan Umum')`
        })
        .from(posOrders)
        .leftJoin(posCustomers, eq(posCustomers.id, posOrders.customerId))
        .where(eq(posOrders.unitId, unitId))
        .orderBy(desc(posOrders.createdAt))
        .limit(5);

        const orderIds = recentRows.map(row => row.id);
        let orderItems = [];

        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            const itemsRows = await db.select({
                id: posOrderItems.id,
                product_id: posOrderItems.productId,
                order_id: posOrderItems.orderId,
                product_name: posOrderItems.productName,
                qty: posOrderItems.qty,
                price: posOrderItems.price,
                total: posOrderItems.total
            })
            .from(posOrderItems)
            .where(inArray(posOrderItems.orderId, orderIds))
            .orderBy(asc(posOrderItems.id));
            orderItems = itemsRows;
        }

        const recentOrders = recentRows.map((order) => ({
            ...order,
            customer: order.customer_name || 'Pelanggan Umum',
            total: Number(order.total) || 0,
            items: orderItems
                .filter(item => Number(item.order_id) === Number(order.id))
                .map(item => ({
                    order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    qty: Number(item.qty),
                    price: Number(item.price),
                    total: Number(item.total)
                }))
        }));

        const topProductsRows = await db.select({
            product_name: posOrderItems.productName,
            total_qty: sql`SUM(${posOrderItems.qty})`,
            total_revenue: sql`SUM(${posOrderItems.total})`
        })
        .from(posOrderItems)
        .innerJoin(posOrders, eq(posOrders.id, posOrderItems.orderId))
        .where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID')))
        .groupBy(posOrderItems.productName)
        .orderBy(desc(sql`SUM(${posOrderItems.qty})`))
        .limit(5);

        return {
            stats: {
                totalSales: Number(statsRows[0]?.total_sales) || 0,
                totalOrders: statsRows[0]?.total_orders || 0,
                averageTicket: Number(statsRows[0]?.average_ticket) || 0,
                topProduct: topProductsRows[0]?.product_name || 'N/A'
            },
            recentOrders,
            topProducts: topProductsRows.map(product => ({
                name: product.product_name,
                quantity: Number(product.total_qty),
                revenue: Number(product.total_revenue)
            }))
        };
    } catch (e) {
        console.error("MySQL Error:", e.message);
        throw error(500, "Koneksi Database Gagal: " + e.message);
    }
}