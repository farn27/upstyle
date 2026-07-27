import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { purchaseOrders, purchaseOrderItems, products, stockLogs, unitBisnis } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Unauthorized');

    const { poId } = params;
    const poIdNum = Number(poId);

    const po = await db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, poIdNum),
        with: {
            items: true // This requires relations defined in schema. If not, we do separate query.
        }
    });

    if (!po) throw error(404, 'PO tidak ditemukan');

    // Karena Drizzle relations kadang butuh setup manual, kita query items manual agar aman
    const items = await db.select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        qtyOrdered: purchaseOrderItems.qtyOrdered,
        qtyReceived: purchaseOrderItems.qtyReceived,
        unitPrice: purchaseOrderItems.unitPrice,
        totalPrice: purchaseOrderItems.totalPrice,
        productName: products.nama
    })
    .from(purchaseOrderItems)
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.poId, poIdNum));

    return {
        po,
        items
    };
};

export const actions = {
    receiveItems: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { poId, slug } = params;
        const formData = await request.formData();
        
        try {
            // Get all items in this PO
            const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, Number(poId)));
            
            // Dapatkan unitId dari params/db untuk log
            const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.slug, slug) });
            if(!unit) return fail(404, { message: 'Unit not found' });

            let allFullyReceived = true;

            for (const item of items) {
                const receivedQtyStr = formData.get(`received_${item.id}`);
                const receivedQty = receivedQtyStr ? Number(receivedQtyStr) : 0;
                
                if (receivedQty > 0) {
                    const newTotalReceived = (item.qtyReceived || 0) + receivedQty;
                    
                    if (newTotalReceived < item.qtyOrdered) {
                        allFullyReceived = false;
                    }

                    // Update PO Item
                    await db.update(purchaseOrderItems)
                        .set({ qtyReceived: newTotalReceived })
                        .where(eq(purchaseOrderItems.id, item.id));

                    // Tambah stok ke produk utama
                    const prod = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
                    if (prod) {
                        const newStock = (prod.stok || 0) + receivedQty;
                        await db.update(products).set({ stok: newStock }).where(eq(products.id, item.productId));

                        // Catat ke stock_logs
                        await db.insert(stockLogs).values({
                            unitId: unit.id,
                            productId: item.productId,
                            userId: String(userId),
                            stokAwal: prod.stok || 0,
                            perubahan: receivedQty,
                            stokAkhir: newStock,
                            alasan: 'MASUK',
                            keterangan: `Penerimaan PO: ${poId}`,
                        });
                    }
                } else {
                    if ((item.qtyReceived || 0) < item.qtyOrdered) {
                        allFullyReceived = false;
                    }
                }
            }

            // Update status PO
            const newStatus = allFullyReceived ? 'COMPLETED' : 'PARTIAL';
            await db.update(purchaseOrders).set({ status: newStatus }).where(eq(purchaseOrders.id, Number(poId)));

            return { success: true, message: 'Penerimaan barang berhasil dicatat' };
        } catch (e) {
            console.error('Receive Error:', e);
            return fail(500, { message: 'Terjadi kesalahan sistem' });
        }
    }
};
