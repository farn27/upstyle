import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// Host Shopee bisa diambil dari environment, tapi default ke Sandbox/Prod URL
const SHOPEE_HOST = env.SHOPEE_HOST || 'https://partner.shopeemobile.com';

/**
 * Generate HMAC-SHA256 signature sesuai standar Shopee OpenAPI 2.0
 */
export function generateShopeeSignature(path, partnerKey, partnerId, timestamp, accessToken = '', shopId = '') {
    const baseStr = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    return crypto.createHmac('sha256', partnerKey).update(baseStr).digest('hex');
}

/**
 * Mendapatkan URL otorisasi (Shop Authorization URL)
 * @param {string} partnerId 
 * @param {string} partnerKey 
 * @param {string} redirectUrl 
 * @param {string} state - Base64 encoded payload to identify the tenant
 */
export function getAuthorizationUrl(partnerId, partnerKey, redirectUrl, state = '') {
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSignature(path, partnerKey, partnerId, timestamp);
    
    // Karena kita masih mengizinkan mock untuk sandbox/simulasi
    if (partnerId === 'MOCK_PARTNER_ID') {
        return `/shopee-mock?redirect=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`;
    }

    const authUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
    
    // Shopee API tidak secara resmi mendokumentasikan &state= tapi kita bisa menyisipkannya 
    // jika mereka pass through, atau kita masukkan ke redirect URL secara langsung.
    // Opsi aman: Masukkan state ke dalam `redirect` url parameter
    const redirectWithState = new URL(redirectUrl);
    redirectWithState.searchParams.set('state', state);
    
    const finalAuthUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectWithState.toString())}`;
    
    return finalAuthUrl;
}

/**
 * Menukarkan authorization code dengan access token
 */
export async function getAccessToken(code, shopId, partnerId, partnerKey) {
    if (partnerId === 'MOCK_PARTNER_ID') {
        return {
            access_token: 'mock_access_token_' + Math.random().toString(36).substring(7),
            refresh_token: 'mock_refresh_token_' + Math.random().toString(36).substring(7),
            expire_in: 14400,
            shop_id: shopId,
            error: null
        };
    }

    const path = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSignature(path, partnerKey, partnerId, timestamp);

    const body = {
        code,
        shop_id: parseInt(shopId),
        partner_id: parseInt(partnerId)
    };

    try {
        const res = await fetch(`${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        return await res.json();
    } catch (err) {
        console.error("Gagal mendapatkan token Shopee:", err);
        return { error: err.message };
    }
}

/**
 * Menyegarkan access token menggunakan refresh token
 */
export async function refreshAccessToken(refreshToken, shopId, partnerId, partnerKey) {
    if (partnerId === 'MOCK_PARTNER_ID') {
        return {
            access_token: 'mock_access_token_refreshed',
            refresh_token: 'mock_refresh_token_refreshed',
            expire_in: 14400,
            shop_id: shopId,
            error: null
        };
    }

    const path = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSignature(path, partnerKey, partnerId, timestamp);

    const body = {
        refresh_token: refreshToken,
        shop_id: parseInt(shopId),
        partner_id: parseInt(partnerId)
    };

    try {
        const res = await fetch(`${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        return await res.json();
    } catch (err) {
        console.error("Gagal refresh token Shopee:", err);
        return { error: err.message };
    }
}
