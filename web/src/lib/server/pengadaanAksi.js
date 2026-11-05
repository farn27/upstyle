/**
 * Pembantu halaman Pengadaan: cek login + kepemilikan unit, dan ubah error jadi pesan form.
 */
import { error, fail, isHttpError, isRedirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { PengadaanError, unitDariSlug } from '$lib/server/pengadaan';

/**
 * @param {{ params: Record<string, string>, cookies: import('@sveltejs/kit').Cookies }} event
 */
export async function konteksHalaman({ params, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');
	const unit = await unitDariSlug(db, params.slug, userId);
	if (!unit) throw error(404, 'Unit tidak ditemukan');
	return { unit, userId, ctx: { unitId: unit.id, userId } };
}

/**
 * Bungkus isi form action: PengadaanError & error HTTP jadi pesan di form, sisanya dicatat di log.
 * @template T
 * @param {() => Promise<T>} fn
 */
export async function aksiAman(fn) {
	try {
		return await fn();
	} catch (err) {
		if (isRedirect(err)) throw err;
		if (err instanceof PengadaanError) return fail(err.status, { error: err.message });
		if (isHttpError(err)) return fail(err.status, { error: err.body.message });
		log.api.error({ err }, 'Aksi pengadaan gagal');
		return fail(500, { error: 'Terjadi kesalahan sistem. Coba lagi.' });
	}
}

/**
 * Ambil jumlah per barang dari input bernama "qty_<idBarang>".
 * @param {FormData} form
 * @returns {{ itemId: number, qty: string }[]}
 */
export function barisQtyDariForm(form) {
	const baris = [];
	for (const [kunci, nilai] of form.entries()) {
		if (kunci.startsWith('qty_') && String(nilai).trim() !== '') {
			baris.push({ itemId: Number(kunci.slice(4)), qty: String(nilai) });
		}
	}
	return baris;
}

/** @param {FormData} form */
export function dataPODariForm(form) {
	/** @type {any} */
	let items = [];
	try {
		items = JSON.parse(String(form.get('itemsData') || '[]'));
	} catch {
		throw new PengadaanError('Data barang tidak valid');
	}
	return {
		supplierId: form.get('supplierId'),
		expectedDate: form.get('expectedDate'),
		notes: form.get('notes'),
		diskon: form.get('diskon') || 0,
		ongkir: form.get('ongkir') || 0,
		ppnPersen: form.get('ppnPersen') || 0,
		items
	};
}

/**
 * Halaman tagihan butuh id numerik; id aneh dianggap tidak ditemukan.
 * @param {string} nilai
 */
export function idAngka(nilai) {
	const n = Number(nilai);
	if (!Number.isInteger(n) || n <= 0) throw error(404, 'Data tidak ditemukan');
	return n;
}
