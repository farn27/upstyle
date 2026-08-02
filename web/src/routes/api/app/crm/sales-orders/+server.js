import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmContacts, crmDeals, crmActivities, crmTasks, quotations, quotationItems, salesOrders, salesOrderItems, marketingCampaigns } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// GET: ?unitId= - fetch sales orders with items, ordered by createdAt desc
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });

    try {
        const data = await db.query.salesOrders.findMany({
            where: eq(salesOrders.unitId, Number(unitId)),
            orderBy: [desc(salesOrders.createdAt)],
            with: {
                items: true
            }
        });

        return json({ success: true, message: 'Berhasil mengambil data sales order', data });
    } catch (err) {
        log.crm.error({ err }, 'API GET SALES ORDERS ERROR');
        return json({ success: false, message: 'Gagal mengambil data sales order: ' + err.message, data: null }, { status: 500 });
    }
}

// POST: Create sales order. Body: { unitId, customerId, notes, items: [{productId, qty, price, total}] }
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, customerId, notes, items } = body;

        if (!unitId || !Array.isArray(items) || items.length === 0) {
            return json({ success: false, message: 'unitId dan items (min 1) wajib diisi', data: null }, { status: 400 });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const random4 = crypto.randomInt(1000, 10000);
        const orderNumber = `SO-${dateStr}-${random4}`;

        const totalAmount = items.reduce((sum, item) => {
            const itemTotal = item.total !== undefined ? Number(item.total) : (Number(item.qty || 0) * Number(item.price || 0));
            return sum + itemTotal;
        }, 0);

        let newSalesOrderId = null;

        await db.transaction(async (tx) => {
            const [soResult] = await tx.insert(salesOrders).values({
                orderNumber,
                unitId: Number(unitId),
                customerId: customerId ? Number(customerId) : null,
                totalAmount: String(totalAmount.toFixed(2)),
                status: 'PENDING',
                notes: notes || null
            });

            newSalesOrderId = soResult.insertId;

            const itemInserts = items.map(item => ({
                salesOrderId: newSalesOrderId,
                productId: item.productId ? String(item.productId) : null,
                qty: Number(item.qty || 1),
                price: String(item.price || 0),
                total: String(item.total !== undefined ? item.total : (Number(item.qty || 1) * Number(item.price || 0)))
            }));

            await tx.insert(salesOrderItems).values(itemInserts);
        });

        return json({
            success: true,
            message: 'Sales order berhasil dibuat',
            data: { id: newSalesOrderId, orderNumber }
        });
    } catch (err) {
        log.crm.error({ err }, 'API POST SALES ORDERS ERROR');
        return json({ success: false, message: 'Gagal membuat sales order: ' + err.message, data: null }, { status: 500 });
    }
}

// PUT: Update order status. Body: { id, status }.
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return json({ success: false, message: 'id dan status wajib diisi', data: null }, { status: 400 });
        }

        await db.update(salesOrders)
            .set({ status })
            .where(eq(salesOrders.id, Number(id)));

        return json({ success: true, message: 'Status sales order berhasil diperbarui', data: null });
    } catch (err) {
        log.crm.error({ err }, 'API PUT SALES ORDERS ERROR');
        return json({ success: false, message: 'Gagal memperbarui status sales order: ' + err.message, data: null }, { status: 500 });
    }
}
