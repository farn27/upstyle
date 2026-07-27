import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { purchaseOrders, purchaseOrderItems, products, suppliers } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const supplierList = await db.query.suppliers.findMany({
        where: eq(suppliers.unitId, unit.id)
    });

    const productList = await db.query.products.findMany({
        where: eq(products.unitId, unit.id)
    });

    return {
        unit,
        suppliers: JSON.parse(JSON.stringify(supplierList)),
        products: JSON.parse(JSON.stringify(productList))
    };
};

export const actions = {
    createPO: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit not found' });

        const data = await request.formData();
        const poNumber = data.get('poNumber') || `PO-${Date.now()}`;
        const supplierId = data.get('supplierId');
        const expectedDate = data.get('expectedDate');
        const notes = data.get('notes');
        
        // Parse items JSON
        let items = [];
        try {
            items = JSON.parse(data.get('itemsData'));
        } catch(e) {
            return fail(400, { error: 'Data barang tidak valid' });
        }

        if (!supplierId) return fail(400, { error: 'Pilih supplier' });
        if (!items || items.length === 0) return fail(400, { error: 'Tambahkan minimal satu barang' });

        const totalAmount = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);

        try {
            // 1. Insert PO Header
            const [newPO] = await db.insert(purchaseOrders).values({
                unitId: unit.id,
                poNumber,
                supplierId: Number(supplierId),
                status: 'DRAFT',
                expectedDate,
                totalAmount: String(totalAmount),
                notes
            }).returning();

            // 2. Insert PO Items
            for (const item of items) {
                await db.insert(purchaseOrderItems).values({
                    poId: newPO.id,
                    productId: Number(item.productId),
                    qty: Number(item.qty),
                    unitPrice: String(item.unitPrice),
                    subtotal: String(Number(item.qty) * Number(item.unitPrice))
                });
            }
            
            // Redirect will be handled by the client using action result or we can throw redirect.
            // Using return success allows use:enhance to redirect gracefully.
            return { success: true, poId: newPO.id };
        } catch (err) {
            console.error('Create PO Error:', err);
            return fail(500, { error: 'Gagal membuat Purchase Order' });
        }
    }
};
