import { redis } from '$lib/server/redis';
import crypto from 'crypto';

const SESSION_TTL = 60 * 60 * 24; // 24 jam

/**
 * Buat session baru, simpan mapping token -> userId di Redis
 * @param {number} userId
 * @returns {string} session token
 */
export async function createSession(userId) {
	const token = crypto.randomUUID();
	await redis.set(`session:${token}`, userId.toString(), { ex: SESSION_TTL });
	return token;
}

/**
 * Ambil userId dari session token
 * @param {string | undefined} token
 * @returns {number | null}
 */
export async function getUserIdFromSession(token) {
	if (!token) return null;
	const userId = await redis.get(`session:${token}`);
	return userId ? Number(userId) : null;
}

/**
 * Hapus session (logout)
 * @param {string} token
 */
export async function deleteSession(token) {
	if (!token) return;
	await redis.del(`session:${token}`);
}