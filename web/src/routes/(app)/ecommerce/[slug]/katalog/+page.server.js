import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, products } from '$lib/server/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies, url }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');
    const productList = await db.query.products.findMany({
        where: and(eq(products.unitId, unit.id), isNull(products.deletedAt)),
        orderBy: [desc(products.createdAt)]
    });
    return { unit, productList };
};

export const actions = {
    togglePublish: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = String(data.get('product_id'));
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            const p = await db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.unitId, unit.id)) });
            if (!p) return fail(404, { error: 'Produk tidak ditemukan' });
            const newStatus = p.status === 'active' ? 'draft' : 'active';
            await db.update(products).set({ status: newStatus }).where(eq(products.id, id));
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal toggle status' });
        }
    }
};
