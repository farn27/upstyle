import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { websiteSettings, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export const load = async ({ params, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Unauthorized');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Cari settings
    let settings = await db.query.websiteSettings.findFirst({
        where: eq(websiteSettings.unitId, unit.id)
    });

    if (!settings) {
        // Buat default settings di DB
        const [inserted] = await db.insert(websiteSettings).values({
            unitId: unit.id,
            domainSlug: slug,
            theme: 'modern',
            colorPrimary: '#6366F1',
            heroTitle: `Selamat Datang di ${unit.namaUnit}`,
            heroSubtitle: 'Temukan produk-produk pilihan terbaik kami langsung di katalog online kami.',
            aboutUs: `Kami melayani pelanggan kami dengan sepenuh hati. Silakan hubungi kami untuk informasi pemesanan produk.`,
            contactPhone: unit.telepon || '',
            contactEmail: unit.email || '',
            contactAddress: unit.alamat || '',
            isPublished: true
        }).$returningId();

        settings = await db.query.websiteSettings.findFirst({
            where: eq(websiteSettings.id, inserted.id)
        });
    }

    return {
        unit,
        settings
    };
};

export const actions = {
    updateSettings: async ({ request, params, cookies }) => {
        const { slug } = params;
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

        const formData = await request.formData();
        const domainSlug = formData.get('domainSlug')?.toString().trim();
        const theme = formData.get('theme')?.toString();
        const colorPrimary = formData.get('colorPrimary')?.toString();
        const heroTitle = formData.get('heroTitle')?.toString();
        const heroSubtitle = formData.get('heroSubtitle')?.toString();
        const aboutUs = formData.get('aboutUs')?.toString();
        const contactPhone = formData.get('contactPhone')?.toString();
        const contactEmail = formData.get('contactEmail')?.toString();
        const contactAddress = formData.get('contactAddress')?.toString();
        const isPublished = formData.get('isPublished') === 'true';

        if (!domainSlug) {
            return fail(400, { message: 'Subdomain slug wajib diisi' });
        }

        try {
            // Cek keunikan slug jika diubah
            const existingSlug = await db.query.websiteSettings.findFirst({
                where: eq(websiteSettings.domainSlug, domainSlug)
            });

            if (existingSlug && existingSlug.unitId !== unit.id) {
                return fail(400, { message: 'Subdomain slug sudah digunakan oleh toko lain' });
            }

            await db.update(websiteSettings)
                .set({
                    domainSlug,
                    theme,
                    colorPrimary,
                    heroTitle,
                    heroSubtitle,
                    aboutUs,
                    contactPhone,
                    contactEmail,
                    contactAddress,
                    isPublished
                })
                .where(eq(websiteSettings.unitId, unit.id));

            return { success: true, message: 'Setelan website berhasil diperbarui' };
        } catch (err) {
            log.api.error({ err }, 'Update Website Settings Error');
            return fail(500, { message: 'Gagal memperbarui setelan' });
        }
    }
};
