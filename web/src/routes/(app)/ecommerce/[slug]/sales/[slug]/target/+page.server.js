import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, salesTargets, crmDeals, users } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    const { month, year } = thisMonthWIB();

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const targets = await db.query.salesTargets.findMany({
        where: and(eq(salesTargets.unitId, unit.id), eq(salesTargets.periodMonth, month), eq(salesTargets.periodYear, year)),
        with: { user: true }
    });

    // Closing per user bulan ini
    const closingSummary = await db.select({
        userId: crmDeals.salesOwnerId,
        totalClosing: sql`COALESCE(SUM(${crmDeals.nilai}), 0)`,
        dealCount: sql`COUNT(*)`
    }).from(crmDeals)
      .where(and(eq(crmDeals.unitId, unit.id), eq(crmDeals.status, 'won')))
      .groupBy(crmDeals.salesOwnerId);

    const closingMap = {};
    for (const c of closingSummary) closingMap[c.userId] = c;

    const targetsWithProgress = targets.map(t => {
        const c = closingMap[t.userId] || { totalClosing: 0, dealCount: 0 };
        const closing = Number(c.totalClosing);
        const target = Number(t.targetAmount);
        const progress = target > 0 ? Math.min((closing / target) * 100, 100) : 0;
        const komisi = closing * (Number(t.komisiPersen || 0) / 100);
        return { ...t, closing, dealCount: Number(c.dealCount), progress, komisi };
    });

    return { unit, targets: targetsWithProgress, month, year };
};

export const actions = {
    setTarget: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const targetUserId = Number(data.get('user_id'));
        const targetAmount = Number(data.get('target_amount') || 0);
        const komisiPersen = Number(data.get('komisi_persen') || 0);
        const { month, year } = thisMonthWIB();

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            // Upsert: cek existing
            const existing = await db.query.salesTargets.findFirst({
                where: and(eq(salesTargets.unitId, unit.id), eq(salesTargets.userId, targetUserId),
                    eq(salesTargets.periodMonth, month), eq(salesTargets.periodYear, year))
            });

            if (existing) {
                await db.update(salesTargets)
                    .set({ targetAmount: String(targetAmount), komisiPersen: String(komisiPersen) })
                    .where(eq(salesTargets.id, existing.id));
            } else {
                await db.insert(salesTargets).values({
                    unitId: unit.id, userId: targetUserId,
                    targetAmount: String(targetAmount), komisiPersen: String(komisiPersen),
                    periodMonth: month, periodYear: year
                });
            }
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal set target: ' + err.message });
        }
    }
};
