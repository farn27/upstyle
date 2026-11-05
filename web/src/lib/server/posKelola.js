/**
 * Pengaturan POS — SATU logika untuk halaman web (pos/kelola/fitur, pos/kelola/produk)
 * dan API mobile (/api/app/pos/features, /api/app/pos/products).
 */
import { and, eq, isNull } from 'drizzle-orm';
import { unitBisnis, products } from '$lib/server/schema';
import { getActivePosFeatures, POS_FEATURE_DEFAULTS } from '$lib/posFeatures';

/** Semua kunci fitur POS yang dikenal (sumber: default kategori UMUM) */
export const KUNCI_FITUR_POS = Object.keys(POS_FEATURE_DEFAULTS['UMUM']);

/** @param {unknown} v */
function keObjek(v) {
	if (!v) return {};
	if (typeof v === 'string') {
		try { return JSON.parse(v) || {}; } catch { return {}; }
	}
	return /** @type {Record<string, boolean>} */ (v);
}

/**
 * @param {{ kategori?: string | null, posFeatureOverride?: unknown }} unit
 */
export function ringkasFiturPos(unit) {
	const overrides = keObjek(unit.posFeatureOverride);
	return {
		category: unit.kategori || 'UMUM',
		activeFeatures: getActivePosFeatures(unit.kategori, overrides),
		defaultFeatures: getActivePosFeatures(unit.kategori, null),
		overrides,
		keys: KUNCI_FITUR_POS
	};
}

/**
 * Simpan pengaturan fitur. Kunci yang tidak dikenal diabaikan; kunci yang tidak dikirim
 * memakai nilai aktif saat ini (web mengirim semua kunci sekaligus).
 * @param {any} db @param {number} unitId @param {Record<string, unknown>} fitur
 */
export async function simpanFiturPos(db, unitId, fitur) {
	const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, unitId) });
	if (!unit) return null;
	const sekarang = ringkasFiturPos(unit).activeFeatures;
	/** @type {Record<string, boolean>} */
	const baru = {};
	for (const k of KUNCI_FITUR_POS) {
		const v = fitur[k];
		baru[k] = v === undefined ? Boolean(sekarang[k]) : v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
	}
	await db.update(unitBisnis).set({ posFeatureOverride: baru }).where(eq(unitBisnis.id, unitId));
	return ringkasFiturPos({ ...unit, posFeatureOverride: baru });
}

/** @param {any} db @param {number} unitId */
export async function resetFiturPos(db, unitId) {
	await db.update(unitBisnis).set({ posFeatureOverride: null }).where(eq(unitBisnis.id, unitId));
}

/**
 * Tampil / sembunyikan produk di kasir. Produk harus milik unit.
 * @param {any} db @param {number} unitId @param {string} productId @param {boolean} tampil
 * @returns {Promise<boolean>} false kalau produk tidak ditemukan di unit
 */
export async function aturProdukPos(db, unitId, productId, tampil) {
	const [r] = await db
		.update(products)
		.set({ showInPos: tampil ? 1 : 0 })
		.where(and(eq(products.id, String(productId)), eq(products.unitId, unitId)));
	return Boolean(r?.affectedRows);
}

/** Daftar produk untuk pengaturan tampil di kasir (sama dengan pos/kelola/produk) */
export async function daftarProdukPos(/** @type {any} */ db, /** @type {number} */ unitId) {
	const rows = await db
		.select({ id: products.id, nama: products.nama, sku: products.sku, hargaJual: products.hargaJual, stok: products.stok, showInPos: products.showInPos })
		.from(products)
		.where(and(eq(products.unitId, unitId), isNull(products.deletedAt)))
		.orderBy(products.nama);
	return rows.map((/** @type {any} */ p) => ({ ...p, sku: p.sku || '', hargaJual: Number(p.hargaJual || 0), stok: p.stok || 0, showInPos: p.showInPos !== 0 }));
}
