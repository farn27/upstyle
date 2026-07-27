import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, crmDeals, salesTargets, users } from '$lib/server/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';
import { redis } from '$lib/server/redis';

export const load = async ({ params, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    try {
        const unitData = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unitData) throw error(404, 'Unit tidak ditemukan');

        const { month: currentMonth, year: currentYear } = thisMonthWIB();

        // Redis cache — 3 menit
        const cacheKey = `sales_dash:${unitData.id}:${currentMonth}:${currentYear}`;
        const cached = await redis.get(cacheKey);
        if (cached) return { unit: unitData, ...cached };

        // 1. Get total pipeline value (deals that are open)
        const pipelineValueRow = await db.select({
            value: sql`COALESCE(SUM(nilai), 0)`
        }).from(crmDeals).where(and(
            eq(crmDeals.unitId, unitData.id),
            eq(crmDeals.status, 'open')
        ));
        const pipelineValue = Number(pipelineValueRow[0]?.value || 0);

        // 2. Get total deal closing value this month (deals won this month)
        const closedWonRow = await db.select({
            value: sql`COALESCE(SUM(nilai), 0)`,
            count: sql`COUNT(*)`
        }).from(crmDeals).where(and(
            eq(crmDeals.unitId, unitData.id),
            eq(crmDeals.status, 'won')
        ));
        const closedWonValue = Number(closedWonRow[0]?.value || 0);
        const closedWonCount = Number(closedWonRow[0]?.count || 0);

        // 3. Get total targets for this month
        const targetRow = await db.select({
            value: sql`COALESCE(SUM(target_amount), 0)`
        }).from(salesTargets).where(and(
            eq(salesTargets.unitId, unitData.id),
            eq(salesTargets.periodMonth, currentMonth),
            eq(salesTargets.periodYear, currentYear)
        ));
        const targetAmount = Number(targetRow[0]?.value || 0);

        // 4. Sales Leaderboard this month
        const leaderboard = await db.select({
            userId: crmDeals.salesOwnerId,
            username: users.username,
            totalSales: sql`COALESCE(SUM(${crmDeals.nilai}), 0)`,
            dealCount: sql`COUNT(*)`
        })
        .from(crmDeals)
        .leftJoin(users, eq(crmDeals.salesOwnerId, users.id))
        .where(and(
            eq(crmDeals.unitId, unitData.id),
            eq(crmDeals.status, 'won')
        ))
        .groupBy(crmDeals.salesOwnerId, users.username)
        .orderBy(desc(sql`COALESCE(SUM(${crmDeals.nilai}), 0)`));

        // 5. Recent deals list
        const recentDeals = await db.query.crmDeals.findMany({
            where: eq(crmDeals.unitId, unitData.id),
            orderBy: [desc(crmDeals.createdAt)],
            limit: 10,
            with: {
                contact: true
            }
        });

        const finalData = {
            stats: { pipelineValue, closedWonValue, closedWonCount, targetAmount, currentMonth, currentYear },
            leaderboard,
            recentDeals
        };
        await redis.set(cacheKey, finalData, { ex: 180 });
        return { unit: unitData, ...finalData };

    } catch (err) {
        console.error("LOAD SALES DASHBOARD ERROR:", err);
        throw error(500, 'Database error');
    }
};
