import { db } from '$lib/server/drizzle';
import { unitBisnis, vouchers } from '$lib/server/schema';
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

    const promos = await db.select()
        .from(vouchers)
        .where(eq(vouchers.unitId, unitId));

    return {
        promos
    };
}

export const actions = {
    create: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return { success: false, error: 'Unauthorized' };

        const { slug } = params;
        const units = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)));
        if (!units.length) return { success: false, error: 'Unit tidak ditemukan' };
        
        const data = await request.formData();
        const code = data.get('code')?.toString().toUpperCase();
        const discountType = data.get('discountType');
        const discountValue = data.get('discountValue');
        const validFrom = data.get('validFrom');
        const validUntil = data.get('validUntil');
        const maxUsage = data.get('maxUsage') || 0;
        const minPurchase = data.get('minPurchase') || 0;

        try {
            await db.insert(vouchers).values({
                unitId: units[0].id,
                code,
                discountType,
                discountValue,
                validFrom,
                validUntil,
                maxUsage,
                minPurchase
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
    toggle: async ({ request, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const id = data.get('id');
        const isActive = data.get('isActive') === 'true';

        try {
            await db.update(vouchers)
                .set({ isActive })
                .where(eq(vouchers.id, id));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
    delete: async ({ request, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const id = data.get('id');

        try {
            await db.delete(vouchers).where(eq(vouchers.id, id));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
