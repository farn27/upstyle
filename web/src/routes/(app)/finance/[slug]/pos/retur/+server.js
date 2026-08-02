import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posReturns, posReturnItems, warehouseStock, stockLogs, journalEntries, journalEntryLines, products } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { pusherServer } from '$lib/server/pusher';
import { log } from '$lib/server/logger';

export async function POST({ request, cookies, params, locals }) {
    try {
        const { unit, isStaff, isOwner, ownerUserId, staffSession } = await resolvePosUnitAccess(cookies, params, locals);
        
        const { order_id, items, reason } = await request.json();
        
        if (!order_id || !items || !items.length) {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }

        const totalRefund = items.reduce((sum, item) => sum + (Number(item.refund_amount) || 0), 0);
        const returnNumber = 'RET-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        const actorId = isStaff ? staffSession.user_id : ownerUserId;

        await db.transaction(async (tx) => {
            // Verify order belongs to this unit
            const order = await tx.query.posOrders.findFirst({
                where: and(eq(posOrders.id, order_id), eq(posOrders.unitId, unit.id))
            });
            
            if (!order) {
                throw new Error("Order tidak ditemukan atau bukan milik unit ini");
            }

            // Create return record
            const [ret] = await tx.insert(posReturns).values({
                returnNumber,
                orderId: order_id,
                unitId: unit.id,
                handledBy: String(actorId),
                totalRefund: String(totalRefund),
                reason: reason || null,
                status: 'COMPLETED'
            });

            const returnId = ret.insertId;

            // Insert return items and adjust stock
            for (const item of items) {
                await tx.insert(posReturnItems).values({
                    returnId: returnId,
                    orderItemId: item.order_item_id,
                    productId: item.product_id,
                    qtyReturned: item.qty_returned,
                    refundAmount: String(item.refund_amount)
                });

                if (item.product_id) {
                    // Cek apakah produk melacak stok (bukan jasa)
                    const produk = await tx.query.products.findFirst({
                        where: eq(products.id, item.product_id)
                    });
                    
                    if (produk && produk.isService === 0) {
                        // Sesuaikan stok berdasarkan unitId
                        await tx.update(products)
                            .set({ stok: sql`stok + ${item.qty_returned}` })
                            .where(eq(products.id, item.product_id));
                            
                        await tx.insert(stockLogs).values({
                            unitId: unit.id,
                            productId: item.product_id,
                            warehouseId: 0,
                            changeType: 'RETURN',
                            quantityChange: item.qty_returned,
                            referenceId: String(returnId),
                            notes: `Retur POS ${returnNumber}`
                        });
                    }
                }
            }

            // Jurnal Akuntansi Refund (Balik Pendapatan & Kembalikan Kas)
            if (totalRefund > 0) {
                const journalEntryResult = await tx.insert(journalEntries).values({
                    unitId: unit.id,
                    date: new Date().toISOString().split('T')[0],
                    reference: returnNumber,
                    description: `Refund Penjualan POS ${order.orderNumber}`,
                    status: 'POSTED',
                    createdBy: String(actorId)
                });
                
                const entryId = journalEntryResult.insertId;
                
                // Debit: Pendapatan Penjualan (Berkurang) - Akun 4000 (asumsi Pendapatan)
                await tx.insert(journalEntryLines).values({
                    entryId: entryId,
                    accountId: 4000,
                    debit: String(totalRefund),
                    credit: "0.00",
                    description: `Refund Penjualan POS ${order.orderNumber}`
                });
                
                // Credit: Kas (Berkurang) - Akun 1000 (Kas)
                await tx.insert(journalEntryLines).values({
                    entryId: entryId,
                    accountId: 1000,
                    debit: "0.00",
                    credit: String(totalRefund),
                    description: `Pengembalian Dana POS ${order.orderNumber}`
                });
            }

            await tx.update(posOrders)
                .set({ status: 'REFUNDED' })
                .where(eq(posOrders.id, order_id));
        });

        // Trigger pusher event to sync stock realtime for everyone looking at POS
        try {
            pusherServer.trigger(`finance-${params.slug}`, 'pos-stock-updated', {
                triggerRefresh: true
            });
            pusherServer.trigger(`finance-${params.slug}`, 'stats-updated', {
                triggerRefresh: true
            });
        } catch (signalErr) {
            log.pos.warn({ err: signalErr.message }, 'Pusher trigger error retur');
        }

        return json({ success: true, returnNumber });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
