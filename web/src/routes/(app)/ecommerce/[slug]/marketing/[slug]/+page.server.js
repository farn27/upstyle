import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, marketingCampaigns, adTrackers, marketingLeads, vouchers, landingPages } from '$lib/server/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';

export const load = async ({ params, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    try {
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unit) throw error(404, 'Unit bisnis tidak ditemukan');

        const cacheKey = `marketing_dash:${unit.id}`;
        const cached = await redis.get(cacheKey);
        if (cached) return { unit, ...cached };

        // 1. Total Campaigns
        const campaignsRow = await db.select({
            count: sql`COUNT(*)`
        }).from(marketingCampaigns).where(eq(marketingCampaigns.unitId, unit.id));
        const totalCampaigns = Number(campaignsRow[0]?.count || 0);

        // 2. Total Ad Spend
        const adSpendRow = await db.select({
            totalSpend: sql`COALESCE(SUM(spend_amount), 0)`
        }).from(adTrackers).where(eq(adTrackers.unitId, unit.id));
        const totalAdSpend = Number(adSpendRow[0]?.totalSpend || 0);

        // 3. Total Vouchers Active
        const vouchersRow = await db.select({
            count: sql`COUNT(*)`
        }).from(vouchers).where(and(
            eq(vouchers.unitId, unit.id),
            eq(vouchers.isActive, true)
        ));
        const totalVouchers = Number(vouchersRow[0]?.count || 0);

        // 4. Total Leads — Drizzle join (tanpa db.execute raw)
        const leadsCountRow = await db
            .select({ count: sql`COUNT(${marketingLeads.id})` })
            .from(marketingLeads)
            .leftJoin(landingPages, eq(landingPages.id, marketingLeads.landingPageId))
            .where(eq(landingPages.unitId, unit.id));
        const totalLeads = Number(leadsCountRow[0]?.count || 0);

        // 5. Recent Campaigns List
        const recentCampaigns = await db.query.marketingCampaigns.findMany({
            where: eq(marketingCampaigns.unitId, unit.id),
            orderBy: [desc(marketingCampaigns.createdAt)],
            limit: 5
        });

        const finalData = { stats: { totalCampaigns, totalAdSpend, totalVouchers, totalLeads }, recentCampaigns };
        await redis.set(`marketing_dash:${unit.id}`, finalData, { ex: 300 });
        return { unit, ...finalData };

    } catch (err) {
        console.error("LOAD MARKETING DASHBOARD ERROR:", err);
        throw error(500, 'Database error');
    }
};
