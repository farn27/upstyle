/**
 * API: Social Posts / Sosmed
 * GET    /api/app/sosmed?unitId=
 * POST   /api/app/sosmed           create post
 * PUT    /api/app/sosmed           update post
 * DELETE /api/app/sosmed?postId=
 * POST   /api/app/sosmed/generate-caption  AI caption
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { socialPosts, unitBisnis } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import { groqChatCompletion } from '$lib/server/groq';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return apiError('unitId wajib', 400);

    try {
        const posts = await db.select().from(socialPosts)
            .where(eq(socialPosts.unitId, Number(unitId)))
            .orderBy(desc(socialPosts.id));

        const data = posts.map(p => ({
            id: p.id,
            unitId: p.unitId,
            platform: p.platform,
            caption: p.caption,
            imageUrl: p.imageUrl || '',
            scheduledAt: p.scheduledAt || '',
            status: p.status || 'draft',
            createdAt: p.createdAt || ''
        }));

        return apiSuccess(data);
    } catch (err) {
        log.api.error({ err }, 'GET sosmed');
        return apiError('Gagal memuat postingan', 500);
    }
}

const postSchema = z.object({
    unitId: z.coerce.number().int().positive(),
    platform: z.string().min(1),
    caption: z.string().min(1),
    imageUrl: z.string().optional(),
    scheduledAt: z.string().optional(),
    status: z.string().default('draft')
});

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    try {
        const body = await request.json();
        const parsed = postSchema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tidak valid';
            return apiError(msg, 422);
        }

        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, parsed.data.unitId), eq(unitBisnis.userId, userId))
        });
        if (!unit) return apiError('Unit tidak ditemukan', 404);

        const [result] = await db.insert(socialPosts).values({
            unitId: Number(parsed.data.unitId),
            platform: parsed.data.platform,
            caption: parsed.data.caption,
            imageUrl: parsed.data.imageUrl || null,
            scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
            status: parsed.data.status
        });

        return apiSuccess({ id: result.insertId }, 'Postingan berhasil dibuat');
    } catch (err) {
        log.api.error({ err }, 'POST sosmed');
        return apiError('Gagal menyimpan postingan', 500);
    }
}

const updateSchema = z.object({
    id: z.coerce.number().int().positive(),
    platform: z.string().min(1).optional(),
    caption: z.string().min(1).optional(),
    imageUrl: z.string().optional(),
    scheduledAt: z.string().optional(),
    status: z.string().optional()
});

export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    try {
        const body = await request.json();
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tidak valid';
            return apiError(msg, 422);
        }

        const [existing] = await db.select().from(socialPosts)
            .where(eq(socialPosts.id, Number(parsed.data.id)))
            .limit(1);
        if (!existing) return apiError('Postingan tidak ditemukan', 404);

        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, existing.unitId), eq(unitBisnis.userId, userId))
        });
        if (!unit) return apiError('Akses ditolak', 403);

        const { id, scheduledAt, ...rest } = parsed.data;
        const cleanData = { ...rest };
        if (scheduledAt !== undefined) {
            cleanData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        }

        await db.update(socialPosts).set(cleanData).where(eq(socialPosts.id, Number(id)));
        return apiSuccess(null, 'Postingan berhasil diperbarui');
    } catch (err) {
        log.api.error({ err }, 'PUT sosmed');
        return apiError('Gagal memperbarui postingan', 500);
    }
}

export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    const postId = url.searchParams.get('postId');
    if (!postId) return apiError('postId wajib', 400);

    try {
        const [existing] = await db.select().from(socialPosts)
            .where(eq(socialPosts.id, Number(postId)))
            .limit(1);
        if (!existing) return apiError('Postingan tidak ditemukan', 404);

        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, existing.unitId), eq(unitBisnis.userId, userId))
        });
        if (!unit) return apiError('Akses ditolak', 403);

        await db.delete(socialPosts).where(eq(socialPosts.id, Number(postId)));
        return apiSuccess(null, 'Postingan berhasil dihapus');
    } catch (err) {
        log.api.error({ err }, 'DELETE sosmed');
        return apiError('Gagal menghapus postingan', 500);
    }
}
