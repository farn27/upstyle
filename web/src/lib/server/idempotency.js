/**
 * Idempotency untuk API mobile (/api/app/*): request yang dikirim ulang dari antrean offline
 * membawa header `Idempotency-Key`. Kalau request yang sama sudah pernah diproses (balasannya
 * hilang di jalan), server mengembalikan balasan yang tersimpan — transaksi tidak tercatat dua kali.
 * Disimpan di Redis 24 jam; tanpa Redis fitur ini dilewati (request diproses biasa).
 */

const TTL_HASIL = 24 * 60 * 60;
const TTL_KUNCI_PROSES = 60;
const SEDANG_DIPROSES = '__PROSES__';

/** @param {number} userId @param {string} key */
const kunci = (userId, key) => `idem:${userId}:${key}`;

/** Header valid: 8–100 karakter huruf/angka/-/_ */
export function bacaKunciIdempoten(/** @type {Request} */ request) {
	const k = request.headers.get('idempotency-key');
	return k && /^[A-Za-z0-9_-]{8,100}$/.test(k) ? k : null;
}

/**
 * Sebelum request diproses.
 * @returns {Promise<Response | null>} balasan tersimpan / 409 kalau sedang diproses; null = lanjut proses
 */
export async function mulaiIdempoten(/** @type {any} */ redis, /** @type {number} */ userId, /** @type {string} */ key) {
	if (!redis) return null;
	try {
		const ambil = await redis.set(kunci(userId, key), SEDANG_DIPROSES, { nx: true, ex: TTL_KUNCI_PROSES });
		if (ambil) return null; // pertama kali → proses
		let simpan = await redis.get(kunci(userId, key));
		if (typeof simpan === 'string' && simpan !== SEDANG_DIPROSES) {
			try { simpan = JSON.parse(simpan); } catch { simpan = null; }
		}
		if (!simpan || simpan === SEDANG_DIPROSES) {
			return new Response(JSON.stringify({ success: false, message: 'Request yang sama sedang diproses', code: 'IDEMPOTENCY_IN_PROGRESS' }), {
				status: 409, headers: { 'Content-Type': 'application/json' }
			});
		}
		return new Response(simpan.body, {
			status: simpan.status,
			headers: { 'Content-Type': 'application/json', 'Idempotent-Replayed': 'true' }
		});
	} catch {
		return null; // Redis bermasalah → proses biasa
	}
}

/** Setelah request diproses: simpan balasan (selain error server 5xx, supaya bisa dicoba lagi) */
export async function selesaiIdempoten(/** @type {any} */ redis, /** @type {number} */ userId, /** @type {string} */ key, /** @type {Response} */ response) {
	if (!redis) return;
	try {
		if (response.status >= 500 || !(response.headers.get('content-type') || '').includes('application/json')) {
			await redis.del(kunci(userId, key));
			return;
		}
		const body = await response.clone().text();
		await redis.set(kunci(userId, key), JSON.stringify({ status: response.status, body }), { ex: TTL_HASIL });
	} catch {
		// best-effort
	}
}
