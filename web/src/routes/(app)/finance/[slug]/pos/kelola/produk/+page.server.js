import { db } from '$lib/server/drizzle';
import { unitBisnis, products } from '$lib/server/schema';
import { eq, and, or } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies, params }) {
    const userId = await getCurrentUserId(cookies);
    const { slug } = params;

    const units = await db.select({ id: unitBisnis.id })
        .from(unitBisnis)
        .where(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)));
    
    if (!units.length) return { error: 'Unit tidak ditemukan' };
    const unitId = units[0].id;

    const posProducts = await db.select()
        .from(products)
        .where(eq(products.unitId, unitId));

    return {
        products: posProducts
    };
}

export const actions = {
    toggle: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const productId = data.get('productId');
        const showInPos = data.get('showInPos') === 'true' ? 1 : 0;

        try {
            await db.update(products)
                .set({ showInPos })
                .where(eq(products.id, productId));
            
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
