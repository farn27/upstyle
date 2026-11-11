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
import { domainSlugUnik, slugDasar } from '$lib/server/unitBaru';
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

            const slug = await domainSlugUnik(db, unit.slug || unit.namaUnit, 'website');
            const [inserted] = await db.insert(websiteSettings).values({
                unitId: Number(unitId),
                domainSlug: slug,
                theme: 'modern',
                colorPrimary: '#4F46E5',
                heroTitle: `Selamat Datang di ${unit.namaUnit}`,
                isPublished: true
            }).then(([r]) => [{ id: r.insertId }]);

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
        // Alamat situs /w/<slug> harus unik se-server dan berformat rapi
        const slug = slugDasar(rest.domainSlug).slice(0, 100);
        if (!slug) return apiError('Alamat situs tidak valid', 422);
        const dipakai = await db.query.websiteSettings.findFirst({ where: eq(websiteSettings.domainSlug, slug), columns: { unitId: true } });
        if (dipakai && dipakai.unitId !== Number(unitId)) return apiError('Alamat situs sudah dipakai, pilih yang lain', 409);
        rest.domainSlug = slug;

        const ada = await db.query.websiteSettings.findFirst({ where: eq(websiteSettings.unitId, Number(unitId)), columns: { id: true } });
        if (!ada) {
            // belum pernah dibuka sebelumnya → buat dulu (sebelumnya UPDATE tanpa baris = tidak menyimpan apa pun)
            await db.insert(websiteSettings).values({ unitId: Number(unitId), ...rest });
            return apiSuccess(null, 'Pengaturan website berhasil disimpan');
        }
        await db.update(websiteSettings).set(rest).where(eq(websiteSettings.unitId, Number(unitId)));
        return apiSuccess(null, 'Pengaturan website berhasil diperbarui');
    } catch (err) {
        log.api.error({ err }, 'PUT website');
        return apiError('Gagal memperbarui pengaturan website', 500);
    }
}
