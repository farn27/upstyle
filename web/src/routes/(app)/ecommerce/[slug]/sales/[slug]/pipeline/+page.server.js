import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, crmDeals, crmContacts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { nowWIB } from '$lib/server/dateUtils';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';

const STAGES = ['prospek', 'negosiasi', 'penawaran', 'closing', 'won'];

export const load = async ({ params, cookies, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    depends('sales:pipeline');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `sales_pipeline:${unit.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return { unit, ...cached, stages: STAGES };

    const [deals, contacts] = await Promise.all([
        db.query.crmDeals.findMany({
            where: eq(crmDeals.unitId, unit.id),
            orderBy: [desc(crmDeals.createdAt)],
            with: { contact: true }
        }),
        db.query.crmContacts.findMany({
            where: eq(crmContacts.unitId, unit.id),
            columns: { id: true, nama: true }
        })
    ]);

    // Group by stage
    const grouped = {};
    for (const s of STAGES) grouped[s] = [];
    for (const d of deals) {
        const s = d.stage || 'prospek';
        if (grouped[s]) grouped[s].push(d);
        else grouped['prospek'].push(d);
    }

    await redis.set(cacheKey, { grouped, contacts }, { ex: 60 });
    return { unit, grouped, contacts, stages: STAGES };
};

export const actions = {
    updateStage: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const dealId = Number(data.get('deal_id'));
        const stage = String(data.get('stage') || 'prospek');
        const status = stage === 'won' ? 'won' : stage === 'lost' ? 'lost' : 'open';

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            await db.update(crmDeals)
                .set({ stage, status })
                .where(and(eq(crmDeals.id, dealId), eq(crmDeals.unitId, unit.id)));

            await redis.del(`sales_pipeline:${unit.id}`);
            await redis.del(`sales_dash:${unit.id}:*`).catch(() => {});
            pusherServer.trigger(`sales-${slug}`, 'pipeline-updated', { dealId, stage }).catch(() => {});
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal update stage' });
        }
    },

    createDeal: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const namaDeal = String(data.get('nama_deal') || '').trim();
        const nilai = Number(data.get('nilai') || 0);
        const stage = String(data.get('stage') || 'prospek');
        const kontakId = data.get('kontak_id') ? Number(data.get('kontak_id')) : null;

        if (!namaDeal) return fail(400, { error: 'Nama deal wajib diisi' });

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            await db.insert(crmDeals).values({
                ownerId: userId, unitId: unit.id, namaDeal,
                nilai: String(nilai), stage, kontakId, status: 'open'
            });
            await redis.del(`sales_pipeline:${unit.id}`);
            pusherServer.trigger(`sales-${slug}`, 'pipeline-updated', { action: 'create' }).catch(() => {});
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal buat deal: ' + err.message });
        }
    },

    deleteDeal: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const dealId = Number(data.get('deal_id'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            await db.delete(crmDeals)
                .where(and(eq(crmDeals.id, dealId), eq(crmDeals.unitId, unit.id)));
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal hapus deal' });
        }
    }
};
