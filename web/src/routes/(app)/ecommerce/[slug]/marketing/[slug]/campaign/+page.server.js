import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, marketingCampaigns, adTrackers } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { todayStrWIB } from '$lib/server/dateUtils';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';

export const load = async ({ params, cookies, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    depends('marketing:campaign');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `marketing_campaign:${unit.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return { unit, ...cached };

    const [campaigns, adList] = await Promise.all([
        db.query.marketingCampaigns.findMany({
            where: eq(marketingCampaigns.unitId, unit.id),
            orderBy: [desc(marketingCampaigns.createdAt)]
        }),
        db.query.adTrackers.findMany({
            where: eq(adTrackers.unitId, unit.id),
            orderBy: [desc(adTrackers.trackingDate)]
        })
    ]);

    const totalSpend = adList.reduce((s, a) => s + Number(a.spendAmount || 0), 0);
    const totalConversions = adList.reduce((s, a) => s + Number(a.conversions || 0), 0);

    const result = { campaigns, adList, totalSpend, totalConversions };
    await redis.set(cacheKey, result, { ex: 180 });
    return { unit, ...result };
};

export const actions = {
    create: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const name = String(data.get('name') || '').trim();
        const type = String(data.get('type') || 'EMAIL');
        const budget = Number(data.get('budget') || 0);
        const composeSubject = String(data.get('compose_subject') || '');
        const composeText = String(data.get('compose_text') || '');

        if (!name) return fail(400, { error: 'Nama kampanye wajib diisi' });
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.insert(marketingCampaigns).values({ unitId: unit.id, name, type, budget: String(budget), composeSubject, composeText, status: 'DRAFT' });
            await redis.del(`marketing_campaign:${unit.id}`);
            await redis.del(`marketing_dash:${unit.id}`);
            pusherServer.trigger(`marketing-${slug}`, 'campaign-created', { name, type }).catch(() => {});
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal buat kampanye' });
        }
    },

    updateStatus: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = Number(data.get('id'));
        const status = String(data.get('status'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.update(marketingCampaigns).set({ status }).where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.unitId, unit.id)));
            await redis.del(`marketing_campaign:${unit.id}`);
            pusherServer.trigger(`marketing-${slug}`, 'campaign-updated', { id, status }).catch(() => {});
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal update status' });
        }
    },

    addAdTracker: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const platform = String(data.get('platform') || 'Meta');
        const spendAmount = Number(data.get('spend_amount') || 0);
        const impressions = Number(data.get('impressions') || 0);
        const clicks = Number(data.get('clicks') || 0);
        const conversions = Number(data.get('conversions') || 0);
        const trackingDate = String(data.get('tracking_date') || todayStrWIB());

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.insert(adTrackers).values({ unitId: unit.id, platform, spendAmount: String(spendAmount), impressions, clicks, conversions, trackingDate });
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal tambah tracker' });
        }
    }
};
