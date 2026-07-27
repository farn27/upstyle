import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, knowledgeBase } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';

export const load = async ({ params, cookies, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    depends('cs:knowledge-base');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `cs_kb:${unit.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return { unit, articles: cached };

    // Cek tabel ada
    const articles = await db.query.knowledgeBase.findMany({
        where: eq(knowledgeBase.unitId, unit.id),
        orderBy: [desc(knowledgeBase.createdAt)]
    }).catch(() => []);

    await redis.set(cacheKey, articles, { ex: 300 });
    return { unit, articles };
};

export const actions = {
    create: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const title = String(data.get('title') || '').trim();
        const category = String(data.get('category') || 'Umum').trim();
        const content = String(data.get('content') || '').trim();
        if (!title || !content) return fail(400, { error: 'Judul dan konten wajib diisi' });
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.insert(knowledgeBase).values({ unitId: unit.id, title, category, content });
            await redis.del(`cs_kb:${unit.id}`);
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal simpan artikel' });
        }
    },
    delete: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = Number(data.get('id'));
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.delete(knowledgeBase).where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.unitId, unit.id)));
            await redis.del(`cs_kb:${unit.id}`);
            return { success: true };
        } catch { return fail(500, { error: 'Gagal hapus artikel' }); }
    }
};
