import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { ecommerceSettings, unitBisnis } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ params }) => {
    const { domainSlug } = params;

    const settings = await db.select({
            storefrontName: ecommerceSettings.storefrontName,
            description: ecommerceSettings.description,
            logoUrl: ecommerceSettings.logoUrl,
            isActive: ecommerceSettings.isActive,
            unitId: ecommerceSettings.unitId,
            unitName: unitBisnis.namaUnit
        })
        .from(ecommerceSettings)
        .innerJoin(unitBisnis, eq(unitBisnis.id, ecommerceSettings.unitId))
        .where(eq(ecommerceSettings.domainSlug, domainSlug))
        .limit(1);

    if (!settings.length) {
        throw error(404, 'Toko tidak ditemukan');
    }

    if (!settings[0].isActive) {
        throw error(403, 'Toko sedang tidak aktif');
    }

    return {
        store: settings[0],
        domainSlug
    };
};
