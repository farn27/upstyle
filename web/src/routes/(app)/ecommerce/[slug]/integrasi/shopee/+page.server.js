import { db } from '$lib/server/drizzle.js';
import { marketplaceIntegrations, unitBisnis } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt } from '$lib/server/crypto.js';
import { fail, error } from '@sveltejs/kit';

export async function load({ params }) {
    const { slug } = params;
    const unitList = await db.select().from(unitBisnis).where(eq(unitBisnis.slug, slug)).limit(1);
    if (unitList.length === 0) throw error(404, 'Unit bisnis tidak ditemukan');
    const unit = unitList[0];
    
    const integrations = await db.select().from(marketplaceIntegrations)
        .where(eq(marketplaceIntegrations.unitId, unit.id));
        
    const shopee = integrations.find(i => i.platform === 'shopee');

    return {
        unit: unit,
        shopeeIntegration: shopee || null
    };
}

export const actions = {
    saveCredentials: async ({ request, locals, params }) => {
        const formData = await request.formData();
        const partnerId = formData.get('partnerId');
        const partnerKey = formData.get('partnerKey');

        if (!partnerId || !partnerKey) {
            return fail(400, { error: 'Partner ID dan Partner Key wajib diisi' });
        }

        // Dapatkan unit id dari slug di params
        // Kita bisa ambil dari DB lagi
        const { db } = await import('$lib/server/drizzle.js');
        const { unitBisnis } = await import('$lib/server/schema.js');
        const unit = await db.select().from(unitBisnis).where(eq(unitBisnis.slug, params.slug)).limit(1);
        
        if (unit.length === 0) return fail(404, { error: 'Unit Bisnis tidak ditemukan' });
        const unitId = unit[0].id;

        // Enkripsi partnerKey sebelum disimpan!
        const encryptedKey = encrypt(partnerKey);
        if (!encryptedKey) {
            return fail(500, { error: 'Terjadi kesalahan sistem saat mengenkripsi kunci Anda.' });
        }

        // Cek apakah integrasi shopee sudah ada
        const existing = await db.select().from(marketplaceIntegrations)
            .where(eq(marketplaceIntegrations.unitId, unitId));
        const shopeeInt = existing.find(i => i.platform === 'shopee');

        if (shopeeInt) {
            await db.update(marketplaceIntegrations)
                .set({
                    partnerId: partnerId,
                    partnerKey: encryptedKey,
                    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
                })
                .where(eq(marketplaceIntegrations.id, shopeeInt.id));
        } else {
            await db.insert(marketplaceIntegrations).values({
                unitId: unitId,
                platform: 'shopee',
                partnerId: partnerId,
                partnerKey: encryptedKey,
                isActive: 0 // Belum diotentikasi ke toko
            });
        }

        return { success: true };
    },
    
    // Action tambahan: Menghapus Integrasi
    disconnect: async ({ params }) => {
        const { db } = await import('$lib/server/drizzle.js');
        const { unitBisnis, marketplaceIntegrations } = await import('$lib/server/schema.js');
        
        const unit = await db.select().from(unitBisnis).where(eq(unitBisnis.slug, params.slug)).limit(1);
        if (unit.length === 0) return fail(404, { error: 'Unit Bisnis tidak ditemukan' });
        const unitId = unit[0].id;

        const existing = await db.select().from(marketplaceIntegrations)
            .where(eq(marketplaceIntegrations.unitId, unitId));
        const shopeeInt = existing.find(i => i.platform === 'shopee');
        
        if (shopeeInt) {
            await db.delete(marketplaceIntegrations).where(eq(marketplaceIntegrations.id, shopeeInt.id));
        }
        
        return { success: true };
    }
};
