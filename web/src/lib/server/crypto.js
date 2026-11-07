import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Kunci AES-256 (32 byte) untuk encrypt/decrypt/signState.
 * Urutan: ENCRYPTION_MASTER_KEY (persis 32 karakter) → turunan SHA-256 dari ENCRYPTION_KEY.
 * Di produksi TIDAK ada kunci cadangan: dulu kunci cadangan tertulis di source code, sehingga
 * siapa pun yang membaca kode bisa memalsukan token unduhan ekspor (signState/verifyState).
 */
let kunciCache = /** @type {Buffer | null} */ (null);
function getMasterKey() {
    if (kunciCache) return kunciCache;
    const master = env.ENCRYPTION_MASTER_KEY;
    if (master && master.length === 32) {
        kunciCache = Buffer.from(master, 'utf-8');
    } else if (env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length >= 32) {
        // Pisahkan domain supaya kunci ini berbeda dari kunci encryption.js meski sumbernya sama
        kunciCache = crypto.createHash('sha256').update(`upstyle-crypto-master-v1:${env.ENCRYPTION_KEY}`).digest();
    } else if (dev) {
        console.warn('⚠️ ENCRYPTION_MASTER_KEY / ENCRYPTION_KEY belum diset. Memakai kunci dev (HANYA untuk development).');
        kunciCache = Buffer.from('dev_only_upstyle_crypto_key_0000', 'utf-8');
    } else {
        throw new Error('ENCRYPTION_MASTER_KEY (32 karakter) atau ENCRYPTION_KEY (min. 32 karakter) wajib diset');
    }
    return kunciCache;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: Base64( iv + auth_tag + ciphertext )
 */
export function encrypt(text) {
    if (!text) return null;
    try {
        const key = getMasterKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const tag = cipher.getAuthTag();

        // Combine IV, Tag, and Ciphertext into a single buffer
        // We decode encrypted back to buffer to concat easily, then base64 everything
        const encryptedBuffer = Buffer.from(encrypted, 'base64');
        const result = Buffer.concat([iv, tag, encryptedBuffer]);
        
        return result.toString('base64');
    } catch (e) {
        console.error("Encryption failed:", e);
        return null;
    }
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Input format: Base64( iv + auth_tag + ciphertext )
 */
export function decrypt(encryptedBase64) {
    if (!encryptedBase64) return null;
    try {
        const key = getMasterKey();
        const data = Buffer.from(encryptedBase64, 'base64');
        
        if (data.length <= IV_LENGTH + TAG_LENGTH) {
            throw new Error("Invalid encrypted data length");
        }

        const iv = data.subarray(0, IV_LENGTH);
        const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (e) {
        console.error("Decryption failed:", e);
        return null;
    }
}

/**
 * Sign a payload object into a Base64 URL Safe string (useful for OAuth states)
 */
export function signState(payload) {
    const text = JSON.stringify(payload);
    // Simple way: just encrypt it. Since it's AES-256-GCM, it's authenticated and encrypted.
    // Replace standard Base64 chars to make it URL safe.
    let enc = encrypt(text);
    if (!enc) return '';
    return enc.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Verify and decode an encrypted state
 */
export function verifyState(stateParam) {
    if (!stateParam) return null;
    try {
        // Restore standard Base64
        let base64 = stateParam.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const text = decrypt(base64);
        if (!text) return null;
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}
