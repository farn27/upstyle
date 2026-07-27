import { db } from '$lib/server/drizzle';
import { unitBisnis, posOrders, posShifts } from '$lib/server/schema';
import { eq, and, or, sql, gte } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies, params }) {
    const userId = await getCurrentUserId(cookies);
    const { slug } = params;

    const units = await db.select({ id: unitBisnis.id })
        .from(unitBisnis)
        .where(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)));
    
    if (!units.length) return { error: 'Unit tidak ditemukan' };
    const unitId = units[0].id;

    // Get today's start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 19).replace('T', ' ');

    // Query Today's Orders
    const todaysOrders = await db.select()
        .from(posOrders)
        .where(
            and(
                eq(posOrders.unitId, unitId),
                gte(posOrders.createdAt, todayStr)
            )
        );

    const totalSalesToday = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const orderCountToday = todaysOrders.length;
    
    // Query Active Shifts
    const activeShifts = await db.select()
        .from(posShifts)
        .where(
            and(
                eq(posShifts.unitId, unitId),
                eq(posShifts.status, 'OPEN')
            )
        );

    return {
        stats: {
            totalSalesToday,
            orderCountToday,
            activeShiftsCount: activeShifts.length
        }
    };
}
