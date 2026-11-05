import { db } from '$lib/server/drizzle';
import { products } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { aturProdukPos } from '$lib/server/posKelola';

// Akses unit dicek (pemilik atau staf POS unit ini) — dulu cukup tahu slug unit orang lain.
export async function load({ cookies, params, locals }) {
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);

    const posProducts = await db.select()
        .from(products)
        .where(eq(products.unitId, unit.id));

    return {
        products: posProducts
    };
}

export const actions = {
    toggle: async ({ request, cookies, params, locals }) => {
        const { unit } = await resolvePosUnitAccess(cookies, params, locals);
        const data = await request.formData();
        const productId = String(data.get('productId') || '');
        const showInPos = data.get('showInPos') === 'true';

        try {
            const ok = await aturProdukPos(db, unit.id, productId, showInPos);
            if (!ok) return { success: false, error: 'Produk tidak ditemukan' };
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }
};
