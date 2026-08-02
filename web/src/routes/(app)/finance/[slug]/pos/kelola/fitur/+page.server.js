import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { eq } from 'drizzle-orm';
import { getActivePosFeatures, POS_FEATURE_DEFAULTS } from '$lib/posFeatures';
import { log } from '$lib/server/logger';

export async function load({ params, cookies, locals }) {
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);

    const activeFeatures = getActivePosFeatures(unit.kategori, unit.posFeatureOverride);
    const defaultFeatures = POS_FEATURE_DEFAULTS[unit.kategori || 'UMUM'] || POS_FEATURE_DEFAULTS['UMUM'];
    
    // Determine which are overridden
    const overrideObj = unit.posFeatureOverride || {};

    return {
        unit,
        category: unit.kategori || 'UMUM',
        activeFeatures,
        defaultFeatures,
        overrideObj
    };
}

export const actions = {
    updateFeatures: async ({ request, params, cookies, locals }) => {
        const { unit } = await resolvePosUnitAccess(cookies, params, locals);
        const form = await request.formData();
        
        const defaultFeatures = POS_FEATURE_DEFAULTS['UMUM'];
        const newOverrides = {};
        
        for (const key of Object.keys(defaultFeatures)) {
            newOverrides[key] = form.get(key) === 'true';
        }

        try {
            await db.update(unitBisnis)
                .set({ posFeatureOverride: newOverrides })
                .where(eq(unitBisnis.id, unit.id));
            
            return { success: true };
        } catch (err) {
            log.pos.error({ err }, 'POS Feature override error');
            return { success: false, error: 'Gagal menyimpan pengaturan fitur' };
        }
    },
    resetDefaults: async ({ params, cookies, locals }) => {
        const { unit } = await resolvePosUnitAccess(cookies, params, locals);
        try {
            await db.update(unitBisnis)
                .set({ posFeatureOverride: null })
                .where(eq(unitBisnis.id, unit.id));
            
            return { success: true };
        } catch (err) {
            log.pos.error({ err }, 'POS Feature reset error');
            return { success: false, error: 'Gagal me-reset pengaturan fitur' };
        }
    }
};
