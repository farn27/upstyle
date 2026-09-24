import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 hari
const memorySessions = new Map();

/**
 * Buat session baru, simpan mapping token -> userId di Redis (dengan fallback memory)
 * @param {number} userId
 * @returns {Promise<string>} session token
 */
export async function createSession(userId) {
	const token = crypto.randomUUID();
	const numericUserId = Number(userId);
	memorySessions.set(token, { userId: numericUserId, expiresAt: Date.now() + SESSION_TTL * 1000 });

	if (redis) {
		try {
			await redis.set(`session:${token}`, numericUserId.toString(), { ex: SESSION_TTL });
		} catch (e) {
			log.auth.warn({ err: e?.message }, '⚠️ Redis session set failed, using memory fallback');
		}
	}
	return token;
}

/**
 * Ambil userId dari session token.
 * Sliding TTL: setiap request valid memperpanjang TTL session.
 * @param {string | undefined} token
 * @returns {Promise<number | null>}
 */
export async function getUserIdFromSession(token) {
	if (!token) return null;

	if (redis) {
		try {
			const userId = await redis.get(`session:${token}`);
			if (userId) {
				// Sliding TTL: perpanjang setiap kali dipakai agar tidak expired saat aktif
				await redis.expire(`session:${token}`, SESSION_TTL).catch(() => {});
				return Number(userId);
			}
		} catch (e) {
			log.auth.warn({ err: e?.message }, '⚠️ Redis session get failed, checking memory fallback');
		}
	}

	const mem = memorySessions.get(token);
	if (mem) {
		if (Date.now() > mem.expiresAt) {
			memorySessions.delete(token);
			return null;
		}
		// Sliding TTL untuk memory fallback juga
		mem.expiresAt = Date.now() + SESSION_TTL * 1000;
		return mem.userId;
	}

	return null;
}

/**
 * Hapus session (logout)
 * @param {string} token
 */
export async function deleteSession(token) {
	if (!token) return;
	memorySessions.delete(token);
	if (redis) {
		try {
			await redis.del(`session:${token}`);
		} catch (e) {}
	}
}
