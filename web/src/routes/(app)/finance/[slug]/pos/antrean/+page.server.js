import { db } from '$lib/server/drizzle';
import { posOrders, posOrderItems } from '$lib/server/schema';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { eq, inArray, desc, or, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params, cookies, locals }) {
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);

    try {
        const activeOrders = await db.select()
            .from(posOrders)
            .where(
                and(
                    eq(posOrders.unitId, unit.id),
                    or(
                        eq(posOrders.fulfillmentStatus, 'PENDING'),
                        eq(posOrders.fulfillmentStatus, 'PREPARING'),
                        eq(posOrders.fulfillmentStatus, 'READY')
                    )
                )
            )
            .orderBy(desc(posOrders.id));

        const orderIds = activeOrders.map(o => o.id);
        let items = [];
        if (orderIds.length > 0) {
            items = await db.select().from(posOrderItems).where(inArray(posOrderItems.orderId, orderIds));
        }

        const ordersWithItems = activeOrders.map(order => ({
            ...order,
            items: items.filter(i => i.orderId === order.id)
        }));

        return {
            orders: ordersWithItems,
            unit
        };
    } catch (err) {
        console.error('POS Antrean load error:', err);
        throw error(500, 'Gagal memuat daftar antrean');
    }
}

export const actions = {
    updateFulfillment: async ({ request, params, cookies, locals }) => {
        const { unit } = await resolvePosUnitAccess(cookies, params, locals);
        const form = await request.formData();
        const orderId = form.get('order_id');
        const status = form.get('status');

        if (!orderId || !status) {
            return { success: false, error: 'Data tidak lengkap' };
        }

        try {
            await db.update(posOrders)
                .set({ fulfillmentStatus: status })
                .where(and(eq(posOrders.id, Number(orderId)), eq(posOrders.unitId, unit.id)));
            
            return { success: true };
        } catch (err) {
            console.error('POS Antrean update error:', err);
            return { success: false, error: 'Gagal update status' };
        }
    }
};
