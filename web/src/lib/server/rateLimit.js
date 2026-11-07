/**
 * Rate Limiter berbasis Redis (Sliding Window Counter)
 * Dipakai untuk semua endpoint login & register
 */
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';

/**
 * @param {object} options
 * @param {string} options.key       - Identifikasi unik (IP, email, dll)
 * @param {string} options.prefix    - Prefix key Redis (misal 'rl:login')
 * @param {number} options.limit     - Max request yang diizinkan dalam window
 * @param {number} options.windowSec - Durasi window dalam detik
 * @returns {Promise<{ allowed: boolean, remaining: number, retryAfter: number }>}
 */
export async function checkRateLimit({ key, prefix, limit, windowSec }) {
	const redisKey = `${prefix}:${key}`;
	const now = Math.floor(Date.now() / 1000);
	const windowStart = now - windowSec;

	try {
		// Gunakan pipeline untuk atomic operations
		const [, , count] = await redis.pipeline()
			// Hapus entri yang sudah kadaluarsa dari sorted set
			.zremrangebyscore(redisKey, 0, windowStart)
			// Tambahkan request saat ini
			.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` })
			// Hitung total dalam window
			.zcard(redisKey)
			.exec();

		// Set TTL agar key otomatis terhapus setelah window
		await redis.expire(redisKey, windowSec);

		const currentCount = Number(count) || 0;
		const allowed = currentCount <= limit;
		const remaining = Math.max(0, limit - currentCount);

		// Cari entri tertua untuk hitung retry-after
		let retryAfter = 0;
		if (!allowed) {
			const oldest = await redis.zrange(redisKey, 0, 0, { withScores: true });
			if (oldest && oldest.length >= 2) {
				const oldestTs = Number(oldest[1]);
				retryAfter = Math.max(0, oldestTs + windowSec - now);
			} else {
				retryAfter = windowSec;
			}
		}

		return { allowed, remaining, retryAfter };
	} catch (err) {
		// Jika Redis error, izinkan request (fail open) agar tidak block semua user
		log.api.error({ err: err.message }, '[RateLimit] Redis error, fail open');
		return { allowed: true, remaining: limit, retryAfter: 0 };
	}
}

/**
 * IP klien untuk rate limit.
 * - Vercel menimpa X-Forwarded-For dengan IP asli klien, jadi entri pertama bisa dipercaya.
 * - Di server sendiri (Docker + reverse proxy) entri PERTAMA bisa diisi bebas oleh klien, sehingga
 *   rate limit bisa diakali dengan header palsu. Yang bisa dipercaya adalah entri yang ditambahkan
 *   proxy kita sendiri: entri ke-N dari kanan, N = TRUSTED_PROXY_HOPS (default 1).
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) {
		const daftar = forwarded.split(',').map((x) => x.trim()).filter(Boolean);
		if (daftar.length > 0) {
			if (process.env.VERCEL) return daftar[0];
			const hop = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
			return daftar[Math.max(0, daftar.length - hop)];
		}
	}
	return request.headers.get('x-real-ip') || 'unknown';
}

// ─── Preset config per endpoint ────────────────────────────────────────────

/** Login web (per IP + per email) */
export const LOGIN_LIMIT = { limit: 10, windowSec: 60 * 15 }; // 10x per 15 menit

/** Register web */
export const REGISTER_LIMIT = { limit: 5, windowSec: 60 * 60 }; // 5x per jam

/** Login API mobile */
export const API_LOGIN_LIMIT = { limit: 15, windowSec: 60 * 15 }; // 15x per 15 menit

/** Staff portal login */
export const PORTAL_LOGIN_LIMIT = { limit: 10, windowSec: 60 * 15 }; // 10x per 15 menit

/** WA Webhook */
export const WA_WEBHOOK_LIMIT = { limit: 60, windowSec: 60 }; // 60x per menit

/** Sensitive operations (delete, bulk operations) */
export const SENSITIVE_OP_LIMIT = { limit: 5, windowSec: 60 * 60 }; // 5x per jam

/** Data export operations */
export const EXPORT_LIMIT = { limit: 3, windowSec: 60 * 60 }; // 3x per jam

/** File upload operations */
export const UPLOAD_LIMIT = { limit: 20, windowSec: 60 * 60 }; // 20x per jam

/** API general endpoints */
export const API_GENERAL_LIMIT = { limit: 100, windowSec: 60 }; // 100x per menit

/** Password reset */
export const PASSWORD_RESET_LIMIT = { limit: 3, windowSec: 60 * 60 }; // 3x per jam

/** Email verification resend */
export const EMAIL_VERIFY_LIMIT = { limit: 5, windowSec: 60 * 60 }; // 5x per jam

/** Batas pemakaian AI (Groq) per user: menahan lonjakan & menjaga biaya API */
export const AI_LIMIT_MENIT = { limit: 20, windowSec: 60 };
export const AI_LIMIT_HARI = { limit: 300, windowSec: 60 * 60 * 24 };

/**
 * Cek kuota AI user. Dipanggil sebelum setiap panggilan ke Groq.
 * @param {number | string} userId
 * @returns {Promise<{ allowed: boolean, retryAfter: number, pesan: string }>}
 */
export async function cekKuotaAI(userId) {
	const menit = await checkRateLimit({ key: String(userId), prefix: 'rl:ai:menit', ...AI_LIMIT_MENIT });
	if (!menit.allowed) {
		return { allowed: false, retryAfter: menit.retryAfter, pesan: 'Terlalu banyak permintaan AI. Tunggu sebentar lalu coba lagi.' };
	}
	const hari = await checkRateLimit({ key: String(userId), prefix: 'rl:ai:hari', ...AI_LIMIT_HARI });
	if (!hari.allowed) {
		return { allowed: false, retryAfter: hari.retryAfter, pesan: 'Kuota AI harian sudah habis. Coba lagi besok.' };
	}
	return { allowed: true, retryAfter: 0, pesan: '' };
}
