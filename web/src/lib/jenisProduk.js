/**
 * Jenis barang di data produk. Hanya Barang Jadi yang dijual (kasir, toko online, website,
 * penawaran); jenis lain hanya dibeli lewat Pengadaan dan dipakai sendiri.
 */

export const JENIS_DIJUAL = 'BARANG_JADI';

export const JENIS_PRODUK = {
	BARANG_JADI: {
		label: 'Barang Jadi / Dagangan',
		singkat: 'Barang Jadi',
		keterangan: 'Dijual ke pelanggan',
		warna: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
	},
	BAHAN_BAKU: {
		label: 'Bahan Baku',
		singkat: 'Bahan Baku',
		keterangan: 'Diolah menjadi barang jadi',
		warna: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
	},
	KEMASAN: {
		label: 'Kemasan',
		singkat: 'Kemasan',
		keterangan: 'Cup, plastik, kardus, label',
		warna: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
	},
	PERLENGKAPAN: {
		label: 'Perlengkapan / Habis Pakai',
		singkat: 'Perlengkapan',
		keterangan: 'Sabun, tisu, alat tulis',
		warna: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
	}
};

/** @typedef {keyof typeof JENIS_PRODUK} JenisProduk */

/** @type {JenisProduk[]} */
export const DAFTAR_JENIS = /** @type {any} */ (Object.keys(JENIS_PRODUK));

/**
 * Nilai jenis yang valid; selain itu (termasuk kosong) dianggap Barang Jadi
 * supaya produk lama dan klien lama tetap berperilaku seperti sebelumnya.
 * @param {unknown} nilai
 * @returns {JenisProduk}
 */
export function normalisasiJenis(nilai) {
	const v = String(nilai ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
	if (v in JENIS_PRODUK) return /** @type {JenisProduk} */ (v);
	const alias = { BAHAN: 'BAHAN_BAKU', RAW: 'BAHAN_BAKU', RAW_MATERIAL: 'BAHAN_BAKU', PACKAGING: 'KEMASAN', SUPPLIES: 'PERLENGKAPAN', HABIS_PAKAI: 'PERLENGKAPAN', JADI: 'BARANG_JADI', DAGANGAN: 'BARANG_JADI' };
	return /** @type {JenisProduk} */ (alias[/** @type {keyof typeof alias} */ (v)] || JENIS_DIJUAL);
}

/** @param {unknown} jenis */
export const bisaDijual = (jenis) => normalisasiJenis(jenis) === JENIS_DIJUAL;
