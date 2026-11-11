import { db } from '$lib/server/drizzle.js';
import { unitBisnis, marketplaceIntegrations, riwayatAksi } from '$lib/server/schema.js';
import { getAccessToken } from '$lib/server/shopeeApi.js';
import { and, eq } from 'drizzle-orm';
import { verifyState, decrypt, encrypt } from '$lib/server/crypto.js';
import { log } from '$lib/server/logger';
import { nowSqlWIB } from '$lib/server/dateUtils';

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
        if (!payload || payload.j !== 'shopee' || !payload.unitId || !payload.slug) {
            return new Response('Invalid or corrupted state parameter. Possible CSRF or tampering attempt.', { status: 403 });
        }
        if (typeof payload.x !== 'number' || Date.now() > payload.x) {
            return new Response('Sesi otorisasi sudah kedaluwarsa. Ulangi dari halaman Integrasi Shopee.', { status: 410 });
        }
        // State terenkripsi (AES-GCM) memuat user yang memulai otorisasi; unit harus masih miliknya.
        // Sesi tidak dipakai di sini karena cookie sesi (SameSite=Strict) tidak ikut pada pengalihan dari Shopee.
        const pemulaiId = Number(payload.u);
        const { unitId, slug } = payload;
        const [unitMilik] = pemulaiId
            ? await db.select({ id: unitBisnis.id }).from(unitBisnis)
                .where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, pemulaiId))).limit(1)
            : [];
        if (!unitMilik) {
            return new Response('Unit bisnis tidak ditemukan.', { status: 404 });
        }

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
                updatedAt: nowSqlWIB()
            })
            .where(eq(marketplaceIntegrations.id, shopeeIntegration.id));

        // 5. Catat riwayat
        await db.insert(riwayatAksi).values({
            userId: pemulaiId,
            unitId: unitId,
            pesan: `Berhasil menghubungkan toko Shopee (Shop ID: ${shopId}) secara aman`,
            tipe: 'success',
            kategori: 'ecommerce'
        });

        // 6. Kembali ke halaman Integrasi lewat halaman perantara (bukan redirect 302) supaya navigasinya
        //    berasal dari situs sendiri dan cookie sesi SameSite=Strict ikut terkirim.
        const tujuan = `/ecommerce/${encodeURIComponent(slug)}/integrasi/shopee?success=true`;
        return new Response(
            `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${tujuan}"><title>Shopee terhubung</title></head><body style="font-family:sans-serif;padding:2rem"><p>Toko Shopee berhasil terhubung. <a href="${tujuan}">Kembali ke Bizgrow</a></p></body></html>`,
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
        );
    } catch (err) {
        log.api.error({ err }, 'Shopee Callback Error');
        return new Response('Internal Server Error', { status: 500 });
    }
}
