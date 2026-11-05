/**
 * Hitungan & label modul Pengadaan — dipakai server dan halaman (tanpa akses database).
 */

/** Status PO. RECEIVED = diterima lewat app mobile (dianggap selesai & dibayar tunai). */
export const STATUS_PO = {
	DRAFT: { label: 'Draft', warna: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
	SENT: { label: 'Dipesan', warna: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
	PARTIAL: { label: 'Diterima Sebagian', warna: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
	COMPLETED: { label: 'Selesai', warna: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
	RECEIVED: { label: 'Selesai (Mobile)', warna: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
	CANCELLED: { label: 'Dibatalkan', warna: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' }
};

/** PO yang masih menunggu barang */
export const STATUS_TERBUKA = ['SENT', 'PARTIAL'];

/** Bulatkan ke 2 desimal (nilai rupiah di database) @param {unknown} n */
export function bulat(n) {
	return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

/** @param {unknown} n */
export function rp(n) {
	return 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/** @param {unknown} nilai */
export function tgl(nilai) {
	if (!nilai) return '-';
	const d = new Date(/** @type {any} */ (nilai));
	return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * @typedef {{ diskon?: unknown, ongkir?: unknown, ppnPersen?: unknown }} BiayaPO
 */

/**
 * Total satu PO. Diskon memotong dasar PPN; ongkir tidak kena PPN.
 * @param {{ qty: unknown, unitPrice: unknown }[]} items
 * @param {BiayaPO} biaya
 */
export function hitungTotalPO(items, biaya = {}) {
	const subtotal = bulat(items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0));
	const diskon = bulat(biaya.diskon);
	const ongkir = bulat(biaya.ongkir);
	const dpp = bulat(subtotal - diskon);
	const ppn = bulat((dpp * Number(biaya.ppnPersen || 0)) / 100);
	return { subtotal, diskon, dpp, ongkir, ppn, total: bulat(dpp + ongkir + ppn) };
}

/**
 * Bagian biaya PO untuk sebagian barang (dibagi proporsional dengan nilainya).
 * Dipakai untuk nilai tagihan, retur, dan harga pokok per barang.
 * @param {number} nilaiBarang qty x harga barang yang dihitung
 * @param {number} subtotalPO subtotal seluruh PO
 * @param {BiayaPO} biaya
 * @returns {{ nilaiBarang: number, diskon: number, ongkir: number, ppn: number, persediaan: number, total: number }}
 */
export function hitungPorsi(nilaiBarang, subtotalPO, biaya = {}) {
	const rasio = subtotalPO > 0 ? nilaiBarang / subtotalPO : 0;
	const diskon = bulat(Number(biaya.diskon || 0) * rasio);
	const ongkir = bulat(Number(biaya.ongkir || 0) * rasio);
	const dpp = bulat(nilaiBarang - diskon);
	const ppn = bulat((dpp * Number(biaya.ppnPersen || 0)) / 100);
	const persediaan = bulat(dpp + ongkir);
	return { nilaiBarang: bulat(nilaiBarang), diskon, ongkir, ppn, persediaan, total: bulat(persediaan + ppn) };
}

/**
 * Harga pokok rata-rata bergerak setelah barang masuk.
 * Stok kosong/minus dianggap tidak punya nilai, jadi harga pokok ikut harga barang baru.
 * @param {number} stokLama @param {number} hargaLama @param {number} qty @param {number} hargaBaru
 */
export function hargaRataRata(stokLama, hargaLama, qty, hargaBaru) {
	if (stokLama <= 0) return bulat(hargaBaru);
	return bulat((stokLama * hargaLama + qty * hargaBaru) / (stokLama + qty));
}

/** Sisa barang yang belum datang @param {{ qtyOrdered: number, qtyReceived?: number | null }} item */
export const sisaDiterima = (item) => Math.max(0, Number(item.qtyOrdered) - Number(item.qtyReceived || 0));

/** Barang sudah diterima tapi belum ditagih @param {{ qtyReceived?: number | null, qtyReturned?: number | null, qtyInvoiced?: number | null }} item */
export const sisaDitagih = (item) =>
	Math.max(0, Number(item.qtyReceived || 0) - Number(item.qtyReturned || 0) - Number(item.qtyInvoiced || 0));

/** Barang yang masih bisa diretur @param {{ qtyReceived?: number | null, qtyReturned?: number | null }} item */
export const sisaDiretur = (item) => Math.max(0, Number(item.qtyReceived || 0) - Number(item.qtyReturned || 0));

/**
 * @param {number} nominal @param {number} dibayar
 * @returns {'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS'}
 */
export function statusHutang(nominal, dibayar) {
	if (bulat(dibayar) >= bulat(nominal)) return 'LUNAS';
	return bulat(dibayar) > 0 ? 'SEBAGIAN' : 'BELUM_BAYAR';
}

/**
 * Nomor dokumen berikutnya.
 * @param {string} awalan mis. "PO-12-2611-"
 * @param {string | null | undefined} terakhir nomor terakhir dengan awalan yang sama
 */
export function nomorBerikut(awalan, terakhir) {
	const urut = terakhir ? Number(String(terakhir).slice(awalan.length)) || 0 : 0;
	return `${awalan}${String(urut + 1).padStart(4, '0')}`;
}

/** Tanggal yyyy-mm-dd ditambah sejumlah hari @param {string} tanggal @param {number} hari */
export function tambahHari(tanggal, hari) {
	const d = new Date(`${tanggal}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + Number(hari || 0));
	return d.toISOString().slice(0, 10);
}
