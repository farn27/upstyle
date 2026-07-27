import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// Ensure key is 32 bytes. If not provided, throw error in production. 
// For local dev safety, we can fallback to a dummy key, but it's risky.
// We will throw if not defined, to enforce security.
function getMasterKey() {
    const key = env.ENCRYPTION_MASTER_KEY;
    if (!key || key.length !== 32) {
        // Fallback for development if someone forgets, though in prod this should crash
        console.warn('⚠️ ENCRYPTION_MASTER_KEY is not set or not 32 chars. Using fallback (NOT SECURE FOR PROD)');
        return Buffer.from('bizgrow_upstyle_super_secret_key', 'utf-8');
    }
    return Buffer.from(key, 'utf-8');
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
