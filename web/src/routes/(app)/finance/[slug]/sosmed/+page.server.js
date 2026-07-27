import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { socialPosts, unitBisnis } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { groqChatCompletion } from '$lib/server/groq';

export const load = async ({ params, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Unauthorized');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const posts = await db.query.socialPosts.findMany({
        where: eq(socialPosts.unitId, unit.id),
        orderBy: [desc(socialPosts.createdAt)],
    });

    return { unit, posts };
};

export const actions = {
    createPost: async ({ request, params, cookies }) => {
        const { slug } = params;
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });
        const data = await request.formData();
        const platform = data.get('platform')?.toString();
        const caption = data.get('caption')?.toString();
        const imageUrl = data.get('imageUrl')?.toString();
        const scheduledAt = data.get('scheduledAt')?.toString();
        if (!platform || !caption) {
            return fail(400, { message: 'Platform dan caption wajib diisi' });
        }
        try {
            await db.insert(socialPosts).values({
                unitId: unit.id,
                platform,
                caption,
                imageUrl: imageUrl || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                status: 'draft'
            });
            return { success: true, message: 'Postingan berhasil dibuat' };
        } catch (e) {
            console.error(e);
            return fail(500, { message: 'Gagal menyimpan postingan' });
        }
    },
    generateCaption: async ({ request, params, cookies }) => {
        const { slug } = params;
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });
        const data = await request.formData();
        const productName = data.get('productName')?.toString() || '';
        const prompt = `Tuliskan caption singkat (max 150 karakter) untuk promosi produk **${productName}** di media sosial, dengan gaya energik dan memakai emoji yang cocok.`;
        try {
            const result = await groqChatCompletion({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.1-8b-instant',
                temperature: 0.7,
                max_tokens: 200
            });
            const caption = result?.choices?.[0]?.message?.content?.trim() || '';
            return { success: true, caption };
        } catch (e) {
            console.error(e);
            return fail(500, { message: 'Gagal menghasilkan caption AI' });
        }
    }
};
