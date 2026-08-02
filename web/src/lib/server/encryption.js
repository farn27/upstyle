/**
 * Encryption Utility for Sensitive Data
 * Uses AES-256-GCM for encryption/decryption
 */
import crypto from 'crypto';
import { log } from '$lib/server/logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derive key from password using PBKDF2
 * @param {string} password - The password/key
 * @param {Buffer} salt - The salt
 * @returns {Buffer} The derived key
 */
function deriveKey(password, salt) {
	return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt data
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted string (base64)
 */
export function encrypt(text) {
	try {
		const iv = crypto.randomBytes(IV_LENGTH);
		const salt = crypto.randomBytes(SALT_LENGTH);
		
		const key = deriveKey(ENCRYPTION_KEY, salt);
		
		const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
		
		let encrypted = cipher.update(text, 'utf8', 'binary');
		encrypted += cipher.final('binary');
		
		const tag = cipher.getAuthTag();
		
		// Combine salt + iv + tag + encrypted
		const buffer = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'binary')]);
		
		return buffer.toString('base64');
	} catch (err) {
		log.api.error({ err }, '[Encryption] Error encrypting data');
		throw new Error('Encryption failed');
	}
}

/**
 * Decrypt data
 * @param {string} encryptedData - Encrypted string (base64)
 * @returns {string} Decrypted plain text
 */
export function decrypt(encryptedData) {
	try {
		const buffer = Buffer.from(encryptedData, 'base64');
		
		const salt = buffer.subarray(0, SALT_LENGTH);
		const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
		const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
		const encrypted = buffer.subarray(ENCRYPTED_POSITION);
		
		const key = deriveKey(ENCRYPTION_KEY, salt);
		
		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(tag);
		
		let decrypted = decipher.update(encrypted);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		
		return decrypted.toString('utf8');
	} catch (err) {
		log.api.error({ err }, '[Encryption] Error decrypting data');
		throw new Error('Decryption failed');
	}
}

/**
 * Encrypt sensitive field before saving to database
 * @param {string} value - Value to encrypt
 * @param {boolean} isSensitive - Whether the field is sensitive
 * @returns {string} Encrypted or original value
 */
export function encryptField(value, isSensitive = true) {
	if (!value || !isSensitive) return value;
	return encrypt(value);
}

/**
 * Decrypt sensitive field after retrieving from database
 * @param {string} value - Value to decrypt
 * @param {boolean} isSensitive - Whether the field is sensitive
 * @returns {string} Decrypted or original value
 */
export function decryptField(value, isSensitive = true) {
	if (!value || !isSensitive) return value;
	try {
		return decrypt(value);
	} catch (err) {
		// If decryption fails, return original value (might not be encrypted)
		return value;
	}
}

/**
 * Hash sensitive identifier (for comparison without storing actual value)
 * @param {string} value - Value to hash
 * @returns {string} Hashed value
 */
export function hashSensitive(value) {
	return crypto.createHash('sha256').update(value).digest('hex');
}
