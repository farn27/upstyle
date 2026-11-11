import { json, redirect } from '@sveltejs/kit';
import { getAuthorizationUrl } from '$lib/server/shopeeApi.js';
import { db } from '$lib/server/drizzle.js';
import { unitBisnis, marketplaceIntegrations } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { signState, decrypt } from '$lib/server/crypto.js';

export async function GET({ url, locals }) {
    // Wajib login dan unit harus milik user. Dulu endpoint ini terbuka: siapa pun yang tahu slug bisa
    // memulai otorisasi dan menautkan toko Shopee miliknya ke unit orang lain.
    const userId = locals.user?.id;
    if (!userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const slug = url.searchParams.get('slug');
    if (!slug) {
        return json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    // 1. Get Unit Bisnis (milik user)
    const unit = await db.select({ id: unitBisnis.id }).from(unitBisnis)
        .where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))).limit(1);
    if (unit.length === 0) {
        return json({ error: 'Unit not found' }, { status: 404 });
    }
    const unitId = unit[0].id;

    // 2. Load Partner ID & Partner Key dari DB
    const integrations = await db.select().from(marketplaceIntegrations)
        .where(eq(marketplaceIntegrations.unitId, unitId));
    const shopee = integrations.find(i => i.platform === 'shopee');

    if (!shopee || !shopee.partnerId || !shopee.partnerKey) {
        return json({ error: 'Kredensial Shopee belum dikonfigurasi. Silakan isi Partner ID dan Key terlebih dahulu.' }, { status: 400 });
    }

    const partnerId = shopee.partnerId;
    // Decrypt the partner key before using
    const partnerKey = decrypt(shopee.partnerKey);

    if (!partnerKey) {
         return json({ error: 'Gagal mendekripsi kredensial (Master Key tidak cocok atau data rusak).' }, { status: 500 });
    }

    // 3. Buat state terenkripsi
    // State terikat ke user yang memulai dan berlaku 15 menit
    const statePayload = { unitId, slug, u: userId, x: Date.now() + 15 * 60 * 1000, j: 'shopee' };
    const stateStr = signState(statePayload);

    // Build the redirect URL that Shopee will call back after authorization
    const origin = url.origin;
    const redirectUrl = `${origin}/api/shopee/callback`; // No need slug here, it's in state!
    
    // Get the Shopee Authorization URL
    const authUrl = getAuthorizationUrl(partnerId, partnerKey, redirectUrl, stateStr);

    // Redirect user to Shopee Login page (or our mock page)
    throw redirect(302, authUrl);
}
