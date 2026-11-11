/**
 * Penjaga pusat untuk halaman web ber-slug unit: /finance/<slug>/… dan /ecommerce/<slug>/…
 *
 * Dulu tiap halaman memeriksa sendiri apakah unit milik user yang login. Beberapa halaman lupa
 * (integrasi Shopee, Kelola POS, kategori produk) sehingga user lain bisa membaca/mengubah data unit
 * orang hanya dengan mengganti slug di alamat. Pemeriksaan ini dijalankan di hooks.server.js sebelum
 * halaman mana pun diproses, jadi halaman yang lupa memeriksa tetap terlindungi.
 */
import { eq, or } from 'drizzle-orm';
import { unitBisnis } from './schema.js';

/** Segmen kedua yang BUKAN slug unit */
const BUKAN_SLUG = { finance: new Set(['create', 'planning']), ecommerce: new Set() };

/** Sub-halaman kasir yang hanya untuk pemilik / staf berperan manajer */
const POS_MANAJEMEN = /^\/finance\/[^/]+\/pos\/(kelola|reports)(\/|$)/;
const PERAN_MANAJER = new Set(['owner', 'manager', 'manajer', 'admin', 'supervisor', 'kepala']);

/**
 * @param {string} pathname
 * @returns {{ modul: 'finance' | 'ecommerce', slug: string } | null}
 */
export function slugUnitDariPath(pathname) {
	const m = /^\/(finance|ecommerce)\/([^/]+)(?:\/|$)/.exec(pathname);
	if (!m) return null;
	const modul = /** @type {'finance' | 'ecommerce'} */ (m[1]);
	let slug = m[2];
	try {
		slug = decodeURIComponent(slug);
	} catch {
		/* biarkan apa adanya */
	}
	if (BUKAN_SLUG[modul].has(slug)) return null;
	return { modul, slug };
}

/** @param {string} pathname */
export function halamanPosManajemen(pathname) {
	return POS_MANAJEMEN.test(pathname);
}

/** @param {string | null | undefined} peran */
export function peranManajer(peran) {
	return PERAN_MANAJER.has(String(peran || '').toLowerCase().trim());
}

/**
 * Pemilik unit berdasarkan slug (atau login_slug portal).
 * @param {any} db
 * @param {string} slug
 * @returns {Promise<{ id: number, userId: number } | null>}
 */
export async function pemilikUnitDariSlug(db, slug) {
	if (!slug) return null;
	const rows = await db
		.select({ id: unitBisnis.id, userId: unitBisnis.userId, slug: unitBisnis.slug })
		.from(unitBisnis)
		.where(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)))
		.limit(2);
	if (!rows.length) return null;
	// slug asli diutamakan dibanding login_slug bila keduanya cocok dengan unit berbeda
	const baris = rows.find((/** @type {{ slug: string }} */ r) => r.slug === slug) || rows[0];
	return { id: Number(baris.id), userId: Number(baris.userId) };
}

/**
 * Keputusan akses halaman ber-slug unit.
 * @param {{ pathname: string, userId: number | null, pemilikUnitId: number | null, sesiStaf: { role?: string } | null }} p
 * @returns {'lanjut' | 'bukan_milik' | 'staf_dibatasi'}
 */
export function putuskanAksesUnit({ pathname, userId, pemilikUnitId, sesiStaf }) {
	const pemilik = userId != null && pemilikUnitId != null && Number(userId) === Number(pemilikUnitId);
	if (pemilik) return 'lanjut';
	if (sesiStaf) {
		// Staf (portal) hanya boleh halaman kasir; halaman manajemen kasir butuh peran manajer
		if (halamanPosManajemen(pathname) && !peranManajer(sesiStaf.role)) return 'staf_dibatasi';
		return 'lanjut';
	}
	// Sudah login tetapi unit bukan miliknya (atau unit tidak ada)
	if (userId != null) return 'bukan_milik';
	return 'lanjut'; // belum login: ditangani guard login di hooks
}
