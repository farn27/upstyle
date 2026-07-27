import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { purchaseOrders, suppliers } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Unauthorized');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Fetch POs with Suppliers
    const pos = await db.select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
        supplierName: suppliers.namaSupplier,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.unitId, unit.id))
    .orderBy(desc(purchaseOrders.createdAt));

    return {
        unit,
        pos
    };
};
