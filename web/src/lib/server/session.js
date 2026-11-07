import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import { dev } from '$app/environment';
import crypto from 'crypto';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 hari
/**
 * Cadangan di memori HANYA untuk development. Di produksi (Vercel/serverless) tiap instance punya memori
 * sendiri, jadi sesi di memori membuat user "kadang login kadang tidak" — lebih baik gagal jelas.
 */
const memorySessions = new Map();

/** @returns {NonNullable<typeof redis>} */
function wajibRedis() {
	if (!redis) throw new Error('Redis tidak tersedia (UPSTASH_REDIS_REST_URL / TOKEN belum diset)');
	return redis;
}

/** @param {unknown} e */
const pesanError = (e) => (e instanceof Error ? e.message : String(e));

/** Kunci indeks: semua token sesi milik satu user (untuk logout dari semua perangkat) */
const kunciIndeks = (/** @type {number} */ userId) => `user_sessions:${userId}`;

/**
 * Buat session baru, simpan mapping token -> userId di Redis
 * @param {number} userId
 * @returns {Promise<string>} session token
 */
export async function createSession(userId) {
	const token = crypto.randomUUID();
	const numericUserId = Number(userId);

	try {
		const r = wajibRedis();
		await r.set(`session:${token}`, numericUserId.toString(), { ex: SESSION_TTL });
		try {
			await r.sadd(kunciIndeks(numericUserId), token);
			await r.expire(kunciIndeks(numericUserId), SESSION_TTL);
		} catch (e) {
			log.auth.warn({ err: pesanError(e) }, 'Gagal mencatat indeks sesi user');
		}
	} catch (e) {
		if (!dev) throw e;
		log.auth.warn({ err: pesanError(e) }, '⚠️ Redis session set failed, using memory fallback (dev)');
		memorySessions.set(token, { userId: numericUserId, expiresAt: Date.now() + SESSION_TTL * 1000 });
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

	try {
		const r = wajibRedis();
		const userId = await r.get(`session:${token}`);
		if (userId) {
			// Sliding TTL: perpanjang setiap kali dipakai agar tidak expired saat aktif
			await r.expire(`session:${token}`, SESSION_TTL).catch(() => {});
			return Number(userId);
		}
	} catch (e) {
		log.auth.warn({ err: pesanError(e) }, '⚠️ Redis session get failed');
	}

	if (!dev) return null;
	const mem = memorySessions.get(token);
	if (mem) {
		if (Date.now() > mem.expiresAt) {
			memorySessions.delete(token);
			return null;
		}
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
	try {
		const r = wajibRedis();
		const userId = await r.get(`session:${token}`);
		await r.del(`session:${token}`);
		if (userId) await r.srem(kunciIndeks(Number(userId)), token).catch(() => {});
	} catch (e) {}
}

/**
 * Akhiri SEMUA sesi user (dipakai setelah reset / ganti password).
 * Sesi yang dibuat sebelum indeks ini ada tidak tercatat dan akan habis sendiri (maks. 30 hari).
 * @param {number} userId
 * @param {{ kecuali?: string }} [opsi]  token sesi yang tetap dipertahankan (sesi yang sedang dipakai)
 * @returns {Promise<number>} jumlah sesi yang diakhiri
 */
export async function hapusSemuaSesiUser(userId, opsi = {}) {
	for (const [token, s] of memorySessions) {
		if (s.userId === Number(userId) && token !== opsi.kecuali) memorySessions.delete(token);
	}
	try {
		const r = wajibRedis();
		/** @type {string[]} */
		const tokens = (await r.smembers(kunciIndeks(Number(userId)))) || [];
		const dihapus = tokens.filter((t) => t !== opsi.kecuali);
		if (dihapus.length > 0) {
			await r.del(...dihapus.map((t) => `session:${t}`));
			await r.srem(kunciIndeks(Number(userId)), ...dihapus);
		}
		await r.del(`hooks_user:${userId}`, `layout_session_v2:${userId}`).catch(() => {});
		return dihapus.length;
	} catch (e) {
		log.auth.warn({ err: pesanError(e) }, 'Gagal mengakhiri sesi user');
		return 0;
	}
}
