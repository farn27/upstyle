import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posReturns, posReturnItems, posOrders, posOrderItems, products } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
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

// POST: Create a return
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, orderId, reason, items } = body;

        if (!unitId || !orderId || !items || !Array.isArray(items) || items.length === 0) {
            return json({ success: false, message: "Data retur tidak lengkap" }, { status: 400 });
        }

        const totalRefund = items.reduce((sum, item) => {
            const qty = Number(item.quantity || item.qtyReturned || 0);
            const price = Number(item.priceAtSale || item.refundAmount || 0);
            return sum + (qty * price);
        }, 0);

        const returnNumber = 'RET-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

        const result = await db.transaction(async (tx) => {
            // Verify order exists
            const order = await tx.query.posOrders.findFirst({
                where: and(eq(posOrders.id, Number(orderId)), eq(posOrders.unitId, Number(unitId)))
            });

            if (!order) {
                throw new Error("Order tidak ditemukan atau bukan milik unit ini");
            }

            const [ret] = await tx.insert(posReturns).values({
                returnNumber,
                orderId: Number(orderId),
                unitId: Number(unitId),
                handledBy: String(userId),
                totalRefund: String(totalRefund),
                reason: reason || null,
                status: 'COMPLETED'
            });

            const returnId = ret.insertId;

            for (const item of items) {
                const qty = Number(item.quantity || item.qtyReturned || 1);
                const price = Number(item.priceAtSale || item.refundAmount || 0);
                const itemRefundAmount = qty * price;

                let orderItemId = item.orderItemId || item.order_item_id;
                if (!orderItemId && item.productId) {
                    const foundOrderItem = await tx.query.posOrderItems.findFirst({
                        where: and(eq(posOrderItems.orderId, Number(orderId)), eq(posOrderItems.productId, String(item.productId)))
                    });
                    if (foundOrderItem) orderItemId = foundOrderItem.id;
                }
                if (!orderItemId) {
                    const anyOrderItem = await tx.query.posOrderItems.findFirst({
                        where: eq(posOrderItems.orderId, Number(orderId))
                    });
                    if (anyOrderItem) orderItemId = anyOrderItem.id;
                }

                await tx.insert(posReturnItems).values({
                    returnId,
                    orderItemId: orderItemId || 0,
                    productId: item.productId ? String(item.productId) : null,
                    qtyReturned: qty,
                    refundAmount: String(itemRefundAmount)
                });

                if (item.productId) {
                    await tx.update(products)
                        .set({ stok: sql`stok + ${qty}` })
                        .where(eq(products.id, String(item.productId)));
                }
            }

            return { returnId, returnNumber, totalRefund };
        });

        return json({
            success: true,
            message: "Retur POS berhasil dibuat",
            data: result
        });
    } catch (err) {
        log.pos.error({ err }, 'API POST POS RETURNS ERROR');
        return json({ success: false, message: err.message || "Gagal membuat retur POS" }, { status: 500 });
    }
}
