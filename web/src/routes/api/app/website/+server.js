/**
 * API: Website Settings
 * GET    /api/app/website?unitId=
 * PUT    /api/app/website            update settings
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { websiteSettings, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';

const updateSchema = z.object({
    unitId: z.coerce.number().int().positive(),
    domainSlug: z.string().min(1),
    theme: z.string().optional(),
    colorPrimary: z.string().optional(),
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    aboutUs: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().optional(),
    contactAddress: z.string().optional(),
    facebookUrl: z.string().optional(),
    instagramUrl: z.string().optional(),
    isPublished: z.boolean().optional()
});

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return apiError('unitId wajib', 400);

    try {
        let settings = await db.query.websiteSettings.findFirst({
            where: eq(websiteSettings.unitId, Number(unitId))
        });

        if (!settings) {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId))
            });
            if (!unit) return apiError('Unit tidak ditemukan', 404);

            const slug = unit.slug || unit.namaUnit.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            const [inserted] = await db.insert(websiteSettings).values({
                unitId: Number(unitId),
                domainSlug: slug,
                theme: 'modern',
                colorPrimary: '#4F46E5',
                heroTitle: `Selamat Datang di ${unit.namaUnit}`,
                isPublished: true
            }).$returningId();

            settings = await db.query.websiteSettings.findFirst({
                where: eq(websiteSettings.id, inserted.id)
            });
        }

        return apiSuccess(settings);
    } catch (err) {
        log.api.error({ err }, 'GET website');
        return apiError('Gagal memuat pengaturan website', 500);
    }
}

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

        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, Number(parsed.data.unitId)), eq(unitBisnis.userId, userId))
        });
        if (!unit) return apiError('Unit tidak ditemukan', 404);

        const { unitId, ...rest } = parsed.data;
        await db.update(websiteSettings).set(rest).where(eq(websiteSettings.unitId, Number(unitId)));
        return apiSuccess(null, 'Pengaturan website berhasil diperbarui');
    } catch (err) {
        log.api.error({ err }, 'PUT website');
        return apiError('Gagal memperbarui pengaturan website', 500);
    }
}
