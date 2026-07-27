/**
 * Token management untuk email verification & password reset.
 * Token disimpan di Redis dengan TTL.
 */
import { redis } from '$lib/server/redis';
import crypto from 'crypto';

const VERIFY_TTL = 60 * 60 * 24;    // 24 jam
const RESET_TTL  = 60 * 60;          // 1 jam

// ─── Email Verification ────────────────────────────────────────────────────────

/**
 * Buat token verifikasi email
 * @param {number} userId
 * @returns {Promise<string>} token
 */
export async function createVerifyToken(userId) {
	const token = crypto.randomBytes(32).toString('hex');
	await redis.set(`verify_email:${token}`, String(userId), { ex: VERIFY_TTL });
	return token;
}

/**
 * Validasi & consume token verifikasi (one-time use)
 * @param {string} token
 * @returns {Promise<number|null>} userId atau null
 */
export async function consumeVerifyToken(token) {
	const key = `verify_email:${token}`;
	const userId = await redis.get(key);
	if (!userId) return null;
	await redis.del(key); // one-time use
	return Number(userId);
}

// ─── Password Reset ────────────────────────────────────────────────────────────

/**
 * Buat token reset password
 * @param {number} userId
 * @returns {Promise<string>} token
 */
export async function createResetToken(userId) {
	const token = crypto.randomBytes(32).toString('hex');
	// Hapus token lama jika ada (1 token aktif per user)
	const oldKey = `reset_pw_user:${userId}`;
	const oldToken = await redis.get(oldKey);
	if (oldToken) {
		await redis.del(`reset_pw:${oldToken}`);
	}
	await redis.set(`reset_pw:${token}`, String(userId), { ex: RESET_TTL });
	await redis.set(oldKey, token, { ex: RESET_TTL }); // index user → token
	return token;
}

/**
 * Validasi & consume token reset password (one-time use)
 * @param {string} token
 * @returns {Promise<number|null>} userId atau null
 */
export async function consumeResetToken(token) {
	const key = `reset_pw:${token}`;
	const userId = await redis.get(key);
	if (!userId) return null;
	await redis.del(key);
	await redis.del(`reset_pw_user:${userId}`);
	return Number(userId);
}

/**
 * Peek token tanpa consume (untuk validasi halaman)
 * @param {string} token
 * @returns {Promise<number|null>}
 */
export async function peekResetToken(token) {
	const userId = await redis.get(`reset_pw:${token}`);
	return userId ? Number(userId) : null;
}
