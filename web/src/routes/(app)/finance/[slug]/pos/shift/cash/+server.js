import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, posShifts, posCashTransactions } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function POST({ request, cookies, params }) {
    try {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return json({ error: 'Silakan login ulang' }, { status: 401 });

        const units = await db.select({
            id: unitBisnis.id
        })
        .from(unitBisnis)
        .where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)));
        if (!units.length) return json({ error: 'Unit tidak ditemukan' }, { status: 404 });
        const unit = units[0];

        const { type, amount, description } = await request.json();
        
        if (!['CASH_IN', 'CASH_OUT'].includes(type) || !amount || amount <= 0) {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }

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
        
        const activeShift = activeShiftRecords[0];
        if (!activeShift) {
            return json({ error: 'Tidak ada shift aktif, silakan buka shift dari POS' }, { status: 400 });
        }

        await db.transaction(async (tx) => {
            await tx.insert(posCashTransactions).values({
                shiftId: activeShift.id,
                type,
                amount: String(amount),
                description: description || null
            });

            // Update kasAkhir
            const amountChange = type === 'CASH_IN' ? Number(amount) : -Number(amount);
            await tx.update(posShifts)
                .set({ kasAkhir: sql`kas_akhir + ${amountChange}` })
                .where(eq(posShifts.id, activeShift.id));
        });

        return json({ success: true });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
