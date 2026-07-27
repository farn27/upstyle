import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, supportTickets, supportInboxChannels } from '$lib/server/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';

export const load = async ({ params, cookies, depends }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    depends('cs:dashboard');

    try {
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unit) throw error(404, 'Unit bisnis tidak ditemukan');

        const cacheKey = `cs_dash:${unit.id}`;
        const cached = await redis.get(cacheKey);
        if (cached) return { unit, ...cached };

        // Run all queries in parallel
        const [openRow, resolvedRow, urgentRow, recentTickets, channels] = await Promise.all([
            db.select({ count: sql`COUNT(*)` }).from(supportTickets)
                .where(and(eq(supportTickets.unitId, unit.id), eq(supportTickets.status, 'OPEN'))),
            db.select({ count: sql`COUNT(*)` }).from(supportTickets)
                .where(and(eq(supportTickets.unitId, unit.id), eq(supportTickets.status, 'RESOLVED'))),
            db.select({ count: sql`COUNT(*)` }).from(supportTickets)
                .where(and(eq(supportTickets.unitId, unit.id), eq(supportTickets.priority, 'URGENT'), eq(supportTickets.status, 'OPEN'))),
            db.query.supportTickets.findMany({
                where: eq(supportTickets.unitId, unit.id),
                orderBy: [desc(supportTickets.createdAt)],
                limit: 5,
                with: { customer: true, assignee: true }
            }),
            db.query.supportInboxChannels.findMany({ where: eq(supportInboxChannels.unitId, unit.id) })
        ]);

        const openTickets = Number(openRow[0]?.count || 0);
        const resolvedTickets = Number(resolvedRow[0]?.count || 0);
        const urgentTickets = Number(urgentRow[0]?.count || 0);

        const finalData = {
            stats: { openTickets, resolvedTickets, urgentTickets },
            recentTickets,
            channels
        };
        await redis.set(cacheKey, finalData, { ex: 60 });
        return { unit, ...finalData };

    } catch (err) {
        console.error("LOAD CS DASHBOARD ERROR:", err);
        throw error(500, 'Database error');
    }
};
