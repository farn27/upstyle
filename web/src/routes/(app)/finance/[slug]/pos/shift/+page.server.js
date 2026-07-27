import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, posShifts, posCashTransactions } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ params, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');

	const units = await db.select({
        id: unitBisnis.id,
        nama_unit: unitBisnis.namaUnit,
        slug: unitBisnis.slug
    })
    .from(unitBisnis)
    .where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)));
	if (!units.length) throw error(404, 'Unit tidak ditemukan');
	const unit = units[0];

	// Get Active Shift for current user
	const activeShiftRecords = await db.select()
        .from(posShifts)
        .where(and(
            eq(posShifts.unitId, unit.id),
            eq(posShifts.userId, userId),
            eq(posShifts.status, 'OPEN')
        ))
        .orderBy(desc(posShifts.id))
        .limit(1);
    
    let activeShift = activeShiftRecords[0] || null;
    let cashTransactions = [];

    if (activeShift) {
        cashTransactions = await db.select()
            .from(posCashTransactions)
            .where(eq(posCashTransactions.shiftId, activeShift.id))
            .orderBy(desc(posCashTransactions.createdAt));
    }

	const shiftHistory = await db.select()
        .from(posShifts)
        .where(eq(posShifts.unitId, unit.id))
        .orderBy(desc(posShifts.id))
        .limit(30);

	return {
		unit,
		activeShift,
        cashTransactions,
		shiftHistory
	};
}
