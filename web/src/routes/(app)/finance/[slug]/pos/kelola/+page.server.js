import { db } from '$lib/server/drizzle';
import { posOrders, posShifts } from '$lib/server/schema';
import { eq, and, gte } from 'drizzle-orm';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { todayStrWIB } from '$lib/server/dateUtils';

export async function load({ cookies, params, locals }) {
    // Unit harus milik user / staf unit ini (dulu dicari hanya dengan slug → statistik unit lain terbaca)
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);
    const unitId = unit.id;

    // Awal hari ini menurut WIB (kolom created_at disimpan dalam WIB)
    const todayStr = `${todayStrWIB()} 00:00:00`;

    // Query Today's Orders
    const todaysOrders = await db.select()
        .from(posOrders)
        .where(
            and(
                eq(posOrders.unitId, unitId),
                gte(posOrders.createdAt, todayStr),
                eq(posOrders.status, 'PAID')
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
