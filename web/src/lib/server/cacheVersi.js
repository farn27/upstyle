/**
 * Versi cache per pemilik dan per slug unit.
 *
 * Halaman dasbor, riwayat, dan daftar produk menyimpan hasilnya di Redis 5–10 menit. Dulu cache itu
 * hanya dihapus oleh sebagian jalur tulis (kasir, entri), dengan perintah KEYS yang lambat; jalur lain
 * (bayar hutang/piutang, retur, opname, pengadaan, penggajian, aplikasi mobile, …) tidak menghapusnya,
 * sehingga angka di layar bisa basi sampai 10 menit.
 *
 * Sekarang kunci cache memuat nomor versi. Setiap permintaan yang mengubah data (ditandai di
 * hooks.server.js) menaikkan versinya, sehingga cache lama otomatis tidak terpakai dan habis sendiri.
 * Versi yang sama dipakai klien (GET /api/updates) untuk mengetahui kapan harus memuat ulang.
 */
import { redis } from '$lib/server/redis';

const kunciUser = (/** @type {number | string} */ userId) => `cv:u:${userId}`;
const kunciSlug = (/** @type {string} */ slug) => `cv:s:${String(slug).toLowerCase()}`;
const TTL = 60 * 60 * 24 * 30;

/**
 * Versi gabungan untuk kunci cache halaman milik user pada unit ber-slug tertentu.
 * @param {number | string | null | undefined} userId
 * @param {string | null | undefined} slug
 * @returns {Promise<string>}
 */
export async function versiCache(userId, slug) {
	if (!redis) return '0.0';
	try {
		const [a, b] = await Promise.all([
			userId ? redis.get(kunciUser(userId)) : null,
			slug ? redis.get(kunciSlug(slug)) : null
		]);
		return `${Number(a) || 0}.${Number(b) || 0}`;
	} catch {
		// Redis bermasalah: pakai versi unik supaya tidak pernah menyajikan cache basi
		return `x${Date.now()}`;
	}
}

/**
 * Tandai data berubah → cache halaman terkait tidak dipakai lagi.
 * @param {{ userId?: number | string | null, slug?: string | null }} p
 */
export async function tandaiBerubah({ userId, slug }) {
	if (!redis) return;
	// Tidak boleh menggagalkan permintaan: kalau Redis bermasalah, cache basi paling lama sampai TTL-nya habis
	const naik = async (/** @type {string} */ kunci) => {
		try {
			await redis.incr(kunci);
			await redis.expire(kunci, TTL);
		} catch {
			/* abaikan */
		}
	};
	const tugas = [];
	if (userId) tugas.push(naik(kunciUser(userId)));
	if (slug) tugas.push(naik(kunciSlug(slug)));
	await Promise.all(tugas);
}
