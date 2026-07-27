import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, landingPages, products } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug, pageId } = params;

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const page = await db.query.landingPages.findFirst({
        where: and(eq(landingPages.id, Number(pageId)), eq(landingPages.unitId, unit.id))
    });
    if (!page) throw error(404, 'Halaman tidak ditemukan');

    const productList = await db.query.products.findMany({
        where: and(eq(products.unitId, unit.id), isNull(products.deletedAt)),
        columns: { id: true, nama: true, hargaJual: true, foto: true, stok: true },
        limit: 30
    });

    return {
        unit,
        page: { ...page, contentJson: page.contentJson || { sections: [], globalSettings: { primaryColor: '#4f46e5' } } },
        productList
    };
};

export const actions = {
    save: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug, pageId } = params;
        const data = await request.formData();
        const contentRaw = String(data.get('content_json') || '{}');
        const title = String(data.get('title') || '').trim();

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            const content = JSON.parse(contentRaw);
            await db.update(landingPages)
                .set({ contentJson: content, title: title || undefined })
                .where(and(eq(landingPages.id, Number(pageId)), eq(landingPages.unitId, unit.id)));

            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal menyimpan: ' + err.message });
        }
    },

    publish: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug, pageId } = params;
        const data = await request.formData();
        const isActive = data.get('is_active') === 'true';

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.update(landingPages)
                .set({ isActive })
                .where(and(eq(landingPages.id, Number(pageId)), eq(landingPages.unitId, unit.id)));
            return { success: true, isActive };
        } catch { return fail(500, { error: 'Gagal mengubah status' }); }
    }
};
