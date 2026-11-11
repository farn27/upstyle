/**
 * Edit massal produk (app mobile: POST /api/app/products/bulk) + rollback.
 *
 * Jenis operasi:
 *   PRICE_UPDATE    — harga jual baru: per item (items[].newPrice), atau untuk semua produk
 *                     lewat payload.hargaJual (angka tetap) / payload.persen (naik-turun % dari harga jual)
 *                     / payload.markup (% di atas harga beli, sama seperti kalkulator harga web)
 *   CATEGORY_CHANGE — payload.kategoriId (kategori harus milik unit)
 *   STATUS_CHANGE   — payload.status: active | draft | archived
 *   ARCHIVE         — status 'archived' (masih bisa dibuka lagi)
 *   DELETE          — pindah ke Sampah, sama dengan aksi "soft-delete" di web
 *   RESTORE         — kembalikan dari Sampah, sama dengan aksi "restore" di web
 *
 * Nilai lama setiap produk disimpan di Redis 24 jam supaya operasi bisa di-rollback.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { tandaiBerubah } from './cacheVersi.js';
import { products, kategoriProduk, riwayatAksi, unitBisnis } from '$lib/server/schema';
import { nowWIB, nowSqlWIB } from '$lib/server/dateUtils';

export const JENIS_OPERASI = ['PRICE_UPDATE', 'CATEGORY_CHANGE', 'STATUS_CHANGE', 'ARCHIVE', 'DELETE', 'RESTORE'];
const STATUS_VALID = ['active', 'draft', 'archived'];
const TTL_ROLLBACK = 24 * 60 * 60;

export class MassalError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 422) {
		super(message);
		this.name = 'MassalError';
		this.status = status;
	}
}

/** @param {number} userId @param {string} operationId */
export const kunciRollback = (userId, operationId) => `bulk_op:${userId}:${operationId}`;

/** Format waktu yang diterima kolom timestamp MySQL/TiDB */
const waktuSekarang = () => nowSqlWIB();

/** @param {unknown} v */
const angka = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/**
 * @param {any} db
 * @param {any} redis  boleh null — rollback jadi tidak tersedia
 * @param {{
 *   userId: number, unitId: number, type: string,
 *   productIds?: string[], items?: { productId: string, newPrice?: number | null }[],
 *   payload?: Record<string, unknown>
 * }} input
 */
export async function jalankanOperasiMassal(db, redis, input) {
	const { userId, unitId } = input;
	const type = String(input.type || '').toUpperCase();
	if (!JENIS_OPERASI.includes(type)) {
		throw new MassalError(`Jenis operasi tidak dikenal. Pilihan: ${JENIS_OPERASI.join(', ')}`);
	}
	const payload = input.payload || {};

	/** harga baru per produk dari items[] */
	/** @type {Map<string, number>} */
	const hargaPerItem = new Map();
	for (const it of input.items || []) {
		const harga = angka(it?.newPrice);
		if (it?.productId && harga !== null) hargaPerItem.set(String(it.productId), harga);
	}

	const ids = [...new Set([...(input.productIds || []), ...hargaPerItem.keys()].map(String).filter(Boolean))];
	if (ids.length === 0) throw new MassalError('Pilih minimal 1 produk');
	if (ids.length > 500) throw new MassalError('Maksimal 500 produk sekali proses');

	// Validasi parameter per jenis
	let kategoriBaru = null;
	if (type === 'CATEGORY_CHANGE') {
		const kategoriId = angka(payload.kategoriId);
		if (!kategoriId) throw new MassalError('kategoriId wajib diisi');
		const kat = await db.query.kategoriProduk.findFirst({
			where: and(eq(kategoriProduk.id, kategoriId), eq(kategoriProduk.unitId, unitId))
		});
		if (!kat) throw new MassalError('Kategori tidak ditemukan di unit ini', 404);
		kategoriBaru = kategoriId;
	}
	let statusBaru = null;
	if (type === 'STATUS_CHANGE') {
		statusBaru = String(payload.status || '').toLowerCase();
		if (!STATUS_VALID.includes(statusBaru)) throw new MassalError(`Status harus salah satu: ${STATUS_VALID.join(', ')}`);
	}
	const hargaTetap = angka(payload.hargaJual);
	const persen = angka(payload.persen);
	const markup = angka(payload.markup);
	if (type === 'PRICE_UPDATE' && hargaPerItem.size === 0 && hargaTetap === null && persen === null && markup === null) {
		throw new MassalError('Tentukan harga baru: newPrice per produk, atau payload hargaJual / persen / markup');
	}

	const daftar = await db.query.products.findMany({
		where: and(eq(products.unitId, unitId), inArray(products.id, ids))
	});
	/** @type {Map<string, any>} */
	const produkMap = new Map(daftar.map((/** @type {any} */ p) => [p.id, p]));

	/** @type {{ productId: string, success: boolean, error: string | null }[]} */
	const itemResults = [];
	/** @type {{ id: string, hargaJual: string, kategoriId: number | null, status: string | null, deletedAt: string | null }[]} */
	const snapshot = [];
	const waktu = waktuSekarang();

	await db.transaction(async (/** @type {any} */ tx) => {
		for (const id of ids) {
			const p = produkMap.get(id);
			if (!p) {
				itemResults.push({ productId: id, success: false, error: 'Produk tidak ditemukan di unit ini' });
				continue;
			}

			/** @type {Record<string, any>} */
			let ubah = {};
			if (type === 'PRICE_UPDATE') {
				let harga = hargaPerItem.get(id) ?? null;
				if (harga === null && hargaTetap !== null) harga = hargaTetap;
				if (harga === null && persen !== null) harga = Number(p.hargaJual || 0) * (1 + persen / 100);
				if (harga === null && markup !== null) harga = Number(p.hargaBeli || 0) * (1 + markup / 100);
				if (harga === null || !Number.isFinite(harga) || harga < 0) {
					itemResults.push({ productId: id, success: false, error: 'Harga baru tidak valid' });
					continue;
				}
				ubah = { hargaJual: String(Math.round(harga)) };
			} else if (type === 'CATEGORY_CHANGE') {
				ubah = { kategoriId: kategoriBaru };
			} else if (type === 'STATUS_CHANGE') {
				ubah = { status: statusBaru };
			} else if (type === 'ARCHIVE') {
				ubah = { status: 'archived' };
			} else if (type === 'DELETE') {
				ubah = { status: 'archived', deletedAt: waktu };
			} else if (type === 'RESTORE') {
				ubah = { status: 'active', deletedAt: null };
			}

			snapshot.push({
				id,
				hargaJual: String(p.hargaJual),
				kategoriId: p.kategoriId ?? null,
				status: p.status ?? null,
				deletedAt: p.deletedAt ?? null
			});
			await tx.update(products).set(ubah).where(and(eq(products.id, id), eq(products.unitId, unitId)));
			itemResults.push({ productId: id, success: true, error: null });
		}

		const berhasil = itemResults.filter((r) => r.success).length;
		if (berhasil > 0) {
			await tx.insert(riwayatAksi).values({
				userId,
				unitId,
				pesan: `Edit massal ${type}: ${berhasil} produk`,
				kategori: 'PRODUK',
				tipe: 'info',
				waktu: nowWIB()
			});
		}
	});

	const operationId = `BULK-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	let rollbackTersedia = false;
	if (redis && snapshot.length > 0) {
		try {
			await redis.set(kunciRollback(userId, operationId), { unitId, type, snapshot }, { ex: TTL_ROLLBACK });
			rollbackTersedia = true;
		} catch {
			// Redis gagal → operasi tetap jalan, hanya rollback yang tidak tersedia
		}
	}

	const successCount = itemResults.filter((r) => r.success).length;
	return {
		operationId: rollbackTersedia ? operationId : '',
		totalItems: ids.length,
		successCount,
		failureCount: ids.length - successCount,
		itemResults,
		completedAt: nowSqlWIB(),
		rollbackAvailable: rollbackTersedia
	};
}

/**
 * Kembalikan nilai produk sebelum operasi massal.
 * @param {any} db @param {any} redis
 * @param {{ userId: number, unitId: number, operationId: string }} input
 * @returns {Promise<{ restored: number }>}
 */
export async function rollbackOperasiMassal(db, redis, { userId, unitId, operationId }) {
	if (!operationId) throw new MassalError('operationId wajib diisi');
	if (!redis) throw new MassalError('Rollback tidak tersedia (Redis tidak aktif)', 503);
	const kunci = kunciRollback(userId, operationId);
	let simpan = await redis.get(kunci);
	if (typeof simpan === 'string') {
		try { simpan = JSON.parse(simpan); } catch { simpan = null; }
	}
	if (!simpan || !Array.isArray(simpan.snapshot)) {
		throw new MassalError('Data rollback tidak ditemukan atau sudah kedaluwarsa (24 jam)', 404);
	}
	if (Number(simpan.unitId) !== Number(unitId)) throw new MassalError('Operasi bukan milik unit ini', 404);

	let restored = 0;
	await db.transaction(async (/** @type {any} */ tx) => {
		for (const s of simpan.snapshot) {
			const [hasil] = await tx
				.update(products)
				.set({ hargaJual: s.hargaJual, kategoriId: s.kategoriId, status: s.status, deletedAt: s.deletedAt })
				.where(and(eq(products.id, s.id), eq(products.unitId, unitId)));
			if (hasil?.affectedRows) restored++;
		}
		await tx.insert(riwayatAksi).values({
			userId,
			unitId,
			pesan: `Rollback edit massal ${simpan.type}: ${restored} produk dikembalikan`,
			kategori: 'PRODUK',
			tipe: 'info',
			waktu: nowWIB()
		});
	});
	await redis.del(kunci);
	return { restored };
}

/**
 * Hapus cache halaman produk web supaya hasil edit massal langsung terlihat (best-effort).
 * @param {any} db @param {any} redis @param {number} unitId
 */
export async function bersihkanCacheProduk(db, redis, unitId) {
	if (!redis) return;
	try {
		const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, unitId), columns: { slug: true } });
		if (!unit?.slug) return;
		await tandaiBerubah({ slug: unit.slug });
	} catch {
		// cache basi paling lama sampai TTL habis — tidak menggagalkan operasi
	}
}
