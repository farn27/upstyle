import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, posOrders, posOrderItems } from '$lib/server/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function GET({ cookies, params, url }) {
    try {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const units = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)));
        if (!units.length) return json({ error: 'Unit tidak ditemukan' }, { status: 404 });
        
        const search = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '50');

        let query = db.select()
            .from(posOrders)
            .where(eq(posOrders.unitId, units[0].id))
            .orderBy(desc(posOrders.id))
            .limit(limit);

        const orders = await query;
        
        const orderIds = orders.map(o => o.id);
        let allItems = [];
        if (orderIds.length > 0) {
            allItems = await db.select()
                .from(posOrderItems)
                .where(inArray(posOrderItems.orderId, orderIds));
        }

        // Attach items
        const results = orders.map(o => ({
            ...o,
            items: allItems.filter(i => i.orderId === o.id)
        }));

        return json(results);
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
