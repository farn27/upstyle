import { db } from '$lib/server/drizzle.js';
import { marketplaceIntegrations, unitBisnis } from '$lib/server/schema.js';
import { and, eq } from 'drizzle-orm';
import { encrypt } from '$lib/server/crypto.js';
import { fail, error } from '@sveltejs/kit';
import { nowSqlWIB } from '$lib/server/dateUtils';

/**
 * Unit harus milik user yang login. Dulu unit dicari hanya dengan slug, sehingga user lain bisa
 * membaca, mengganti, atau menghapus kredensial Shopee unit orang.
 * @param {App.Locals} locals
 * @param {string} slug
 */
async function unitMilikUser(locals, slug) {
    const userId = locals.user?.id;
    if (!userId) return null;
    const [unit] = await db
        .select({ id: unitBisnis.id, slug: unitBisnis.slug, namaUnit: unitBisnis.namaUnit, kategori: unitBisnis.kategori })
        .from(unitBisnis)
        .where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId)))
        .limit(1);
    return unit || null;
}

/** @param {number} unitId */
async function integrasiShopee(unitId) {
    const [baris] = await db
        .select()
        .from(marketplaceIntegrations)
        .where(and(eq(marketplaceIntegrations.unitId, unitId), eq(marketplaceIntegrations.platform, 'shopee')))
        .limit(1);
    return baris || null;
}

export async function load({ params, locals }) {
    const unit = await unitMilikUser(locals, params.slug);
    if (!unit) throw error(404, 'Unit bisnis tidak ditemukan');

    const shopee = await integrasiShopee(unit.id);

    // Kunci partner dan token TIDAK dikirim ke browser — cukup status dan pengenalnya
    return {
        unit,
        shopeeIntegration: shopee
            ? {
                  partnerId: shopee.partnerId,
                  shopId: shopee.shopId,
                  isActive: shopee.isActive,
                  tokenExpiresAt: shopee.tokenExpiresAt,
                  punyaKunci: Boolean(shopee.partnerKey)
              }
            : null
    };
}

export const actions = {
    saveCredentials: async ({ request, locals, params }) => {
        const unit = await unitMilikUser(locals, params.slug);
        if (!unit) return fail(404, { error: 'Unit Bisnis tidak ditemukan' });

        const formData = await request.formData();
        const partnerId = String(formData.get('partnerId') || '').trim();
        const partnerKey = String(formData.get('partnerKey') || '').trim();

        if (!partnerId || !partnerKey) {
            return fail(400, { error: 'Partner ID dan Partner Key wajib diisi' });
        }
        if (partnerId.length > 100 || partnerKey.length > 500) {
            return fail(400, { error: 'Partner ID atau Partner Key terlalu panjang' });
        }

        // Enkripsi partnerKey sebelum disimpan
        const encryptedKey = encrypt(partnerKey);
        if (!encryptedKey) {
            return fail(500, { error: 'Terjadi kesalahan sistem saat mengenkripsi kunci Anda.' });
        }

        const shopeeInt = await integrasiShopee(unit.id);
        if (shopeeInt) {
            await db.update(marketplaceIntegrations)
                .set({ partnerId, partnerKey: encryptedKey, updatedAt: nowSqlWIB() })
                .where(and(eq(marketplaceIntegrations.id, shopeeInt.id), eq(marketplaceIntegrations.unitId, unit.id)));
        } else {
            await db.insert(marketplaceIntegrations).values({
                unitId: unit.id,
                platform: 'shopee',
                partnerId,
                partnerKey: encryptedKey,
                isActive: 0 // Belum diotentikasi ke toko
            });
        }

        return { success: true };
    },

    disconnect: async ({ params, locals }) => {
        const unit = await unitMilikUser(locals, params.slug);
        if (!unit) return fail(404, { error: 'Unit Bisnis tidak ditemukan' });

        await db.delete(marketplaceIntegrations)
            .where(and(eq(marketplaceIntegrations.unitId, unit.id), eq(marketplaceIntegrations.platform, 'shopee')));

        return { success: true };
    }
};
