/** @param {unknown} value @returns {'MASUK' | 'KELUAR'} */
export function normalizeKategoriTrx(value) {
	const upper = String(value ?? '').trim().toUpperCase();
	if (upper === 'MASUK') return 'MASUK';
	if (upper === 'KELUAR') return 'KELUAR';
	throw new Error(`Kategori transaksi tidak valid: ${value}`);
}

/** @param {unknown} value */
export function isKategoriMasuk(value) {
	try {
		return normalizeKategoriTrx(value) === 'MASUK';
	} catch {
		return false;
	}
}
