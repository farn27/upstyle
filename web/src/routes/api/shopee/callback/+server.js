import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle.js';
import { unitBisnis, marketplaceIntegrations, riwayatAksi } from '$lib/server/schema.js';
import { getAccessToken } from '$lib/server/shopeeApi.js';
import { eq } from 'drizzle-orm';
import { verifyState, decrypt, encrypt } from '$lib/server/crypto.js';
import { log } from '$lib/server/logger';

export async function GET({ url }) {
    const code = url.searchParams.get('code');
    const shopId = url.searchParams.get('shop_id');
    const stateStr = url.searchParams.get('state'); 

    if (!code || !shopId || !stateStr) {
        return new Response('Missing parameters from Shopee OAuth (code, shop_id, state)', { status: 400 });
    }

    try {
        // 1. Verify State
        const payload = verifyState(stateStr);
        if (!payload || !payload.unitId || !payload.slug) {
            return new Response('Invalid or corrupted state parameter. Possible CSRF or tampering attempt.', { status: 403 });
        }
        
        const { unitId, slug } = payload;

        // 2. Ambil Partner Key dari DB
        const integrations = await db.select().from(marketplaceIntegrations)
            .where(eq(marketplaceIntegrations.unitId, unitId));
        const shopeeIntegration = integrations.find(e => e.platform === 'shopee');

        if (!shopeeIntegration || !shopeeIntegration.partnerId || !shopeeIntegration.partnerKey) {
            return new Response('Kredensial Partner tidak ditemukan di database.', { status: 404 });
        }

        const partnerId = shopeeIntegration.partnerId;
        const partnerKey = decrypt(shopeeIntegration.partnerKey);

        if (!partnerKey) {
            return new Response('Gagal mendekripsi kredensial (Master Key tidak cocok).', { status: 500 });
        }

        // 3. Exchange code for access token
        const tokenRes = await getAccessToken(code, shopId, partnerId, partnerKey);
        
        if (tokenRes.error) {
            return new Response(`Failed to get access token: ${tokenRes.error}`, { status: 500 });
        }

        // 4. Enkripsi dan Save to database
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokenRes.expire_in || 14400));

        const encryptedAccessToken = encrypt(tokenRes.access_token);
        const encryptedRefreshToken = encrypt(tokenRes.refresh_token);

        await db.update(marketplaceIntegrations)
            .set({
                shopId: shopId,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
                isActive: 1,
                updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
            })
            .where(eq(marketplaceIntegrations.id, shopeeIntegration.id));

        // 5. Catat riwayat
        await db.insert(riwayatAksi).values({
            userId: 1, // System or default admin
            unitId: unitId,
            pesan: `Berhasil menghubungkan toko Shopee (Shop ID: ${shopId}) secara aman`,
            tipe: 'success',
            kategori: 'ecommerce'
        });

        // 6. Redirect back to Integration page
        throw redirect(302, `/ecommerce/${slug}/integrasi/shopee?success=true`);
    } catch (err) {
        if (err.status === 302) throw err; // rethrow redirect
        log.api.error({ err }, 'Shopee Callback Error');
        return new Response('Internal Server Error', { status: 500 });
    }
}
