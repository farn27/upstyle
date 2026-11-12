/**
 * Cache jawaban AI berumur pendek. Kuncinya hash dari SELURUH isi permintaan (prompt sistem yang memuat
 * data terkini, riwayat, pesan, model) — begitu data usaha berubah, prompt berubah dan cache otomatis tidak
 * terpakai. Pertanyaan yang diulang (tombol saran, buka ulang analisis) tidak memanggil model lagi.
 *
 * Disimpan di Redis bila tersedia (dibagi antarinstans serverless), selain itu di memori instans.
 */
import { createHash } from 'node:crypto';
import { redis } from '$lib/server/redis';

const MAKS_LOKAL = 300;
/** @type {Map<string, { nilai: string, kedaluwarsa: number }>} */
const lokal = new Map();

/** @param {unknown} isi */
export function kunciCache(isi) {
	return 'ai:jawab:' + createHash('sha256').update(JSON.stringify(isi)).digest('hex').slice(0, 40);
}

/**
 * @param {string} kunci
 * @returns {Promise<string | null>}
 */
export async function ambilCache(kunci) {
	const l = lokal.get(kunci);
	if (l) {
		if (l.kedaluwarsa > Date.now()) return l.nilai;
		lokal.delete(kunci);
	}
	if (!redis) return null;
	try {
		const v = await redis.get(kunci);
		return typeof v === 'string' ? v : v != null ? JSON.stringify(v) : null;
	} catch {
		return null;
	}
}

/**
 * @param {string} kunci
 * @param {string} nilai
 * @param {number} detik
 */
export async function simpanCache(kunci, nilai, detik) {
	if (!nilai) return;
	if (lokal.size >= MAKS_LOKAL) {
		const tertua = lokal.keys().next().value;
		if (tertua) lokal.delete(tertua);
	}
	lokal.set(kunci, { nilai, kedaluwarsa: Date.now() + detik * 1000 });
	if (!redis) return;
	try {
		await redis.set(kunci, nilai, { ex: detik });
	} catch {
		/* cache hanya penghemat; galat diabaikan */
	}
}

/** Untuk pengujian. */
export function kosongkanCacheLokal() {
	lokal.clear();
}
