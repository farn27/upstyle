/**
 * Logika hitung dashboard keuangan (dipakai server, halaman, dan tes).
 * Murni — tidak ada akses database / browser — supaya bisa diuji langsung.
 */

export const PRESETS = ['Semua', 'Hari Ini', 'Kemarin', '7 Hari', 'Bulan Ini'];

/**
 * Semua tanggal dihitung dalam WIB (UTC+7) — sama dengan cara transaksi disimpan —
 * supaya hasil di server Vercel (UTC), browser WIB/WITA/WIT, dan laptop selalu sama.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Komponen kalender WIB untuk sebuah waktu.
 * @param {Date} [now]
 * @returns {{ tahun: number, bulan: number, tanggal: number }} bulan 0-11
 */
function kalenderWIB(now = new Date()) {
	const wib = new Date(now.getTime() + WIB_OFFSET_MS);
	return { tahun: wib.getUTCFullYear(), bulan: wib.getUTCMonth(), tanggal: wib.getUTCDate() };
}

/**
 * (tahun, bulan 0-11, tanggal) → 'YYYY-MM-DD'; tanggal boleh di luar rentang (mis. 0 / -5)
 * @param {number} tahun @param {number} bulan @param {number} tanggal
 * @returns {string}
 */
function formatKalender(tahun, bulan, tanggal) {
	const d = new Date(Date.UTC(tahun, bulan, tanggal));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Rentang tanggal untuk sebuah preset.
 * @param {string} preset
 * @param {Date} [now]
 * @returns {{ start: string, end: string } | null} null = semua waktu
 */
export function rentangPreset(preset, now = new Date()) {
	const { tahun, bulan, tanggal } = kalenderWIB(now);
	const hari = (/** @type {number} */ offset) => formatKalender(tahun, bulan, tanggal + offset);
	if (preset === 'Hari Ini') return { start: hari(0), end: hari(0) };
	if (preset === 'Kemarin') return { start: hari(-1), end: hari(-1) };
	if (preset === '7 Hari') return { start: hari(-6), end: hari(0) }; // 7 hari termasuk hari ini
	if (preset === 'Bulan Ini') return { start: formatKalender(tahun, bulan, 1), end: hari(0) };
	return null; // 'Semua' / tidak dikenal = semua waktu
}

/**
 * Kebalikan rentangPreset: tebak preset dari tanggal di URL ('Kustom' kalau tidak cocok)
 * @param {string | null | undefined} start
 * @param {string | null | undefined} end
 * @param {Date} [now]
 * @returns {string}
 */
export function presetDariRentang(start, end, now = new Date()) {
	if (!start || !end || start === 'all' || end === 'all') return 'Semua';
	for (const preset of PRESETS) {
		const r = rentangPreset(preset, now);
		if (r && r.start === start && r.end === end) return preset;
	}
	return 'Kustom';
}

/** @typedef {number | string | null | undefined} Nominal angka atau string desimal dari MySQL */

/**
 * Saldo kas sepanjang waktu = modal awal + semua pemasukan − semua pengeluaran
 * @param {{ modalAwal: Nominal, totalMasuk: Nominal, totalKeluar: Nominal }} p
 * @returns {number}
 */
export function hitungSaldoKas({ modalAwal, totalMasuk, totalKeluar }) {
	return Number(modalAwal || 0) + Number(totalMasuk || 0) - Number(totalKeluar || 0);
}

/**
 * Proyeksi arus kas bersih sampai akhir bulan, dari laju harian bulan berjalan.
 * Hanya bermakna untuk data "Bulan Ini".
 * @param {{ totalMasuk: Nominal, totalKeluar: Nominal, now?: Date }} p
 * @returns {number}
 */
export function proyeksiArusKasBulanIni({ totalMasuk, totalKeluar, now = new Date() }) {
	const { tahun, bulan, tanggal: hariBerjalan } = kalenderWIB(now);
	const jumlahHari = new Date(Date.UTC(tahun, bulan + 1, 0)).getUTCDate();
	const netPerHari = (Number(totalMasuk || 0) - Number(totalKeluar || 0)) / hariBerjalan;
	return Math.round(netPerHari * jumlahHari);
}

/**
 * Target bulanan otomatis (belum bisa diatur per unit): modal × 1,5, minimal Rp10 jt
 * @param {Nominal} modalAwal
 * @returns {number}
 */
export function targetBulananOtomatis(modalAwal) {
	return Math.max(Number(modalAwal || 0) * 1.5, 10_000_000);
}

/**
 * Perubahan stok saat transaksi dihapus.
 * Penjualan (MASUK) mengurangi stok saat dibuat → dikembalikan.
 * Pengeluaran (KELUAR) tidak pernah mengubah stok → 0.
 * @param {{ productId?: string | null, kategoriTrx?: string | null, qty?: number | null } | null | undefined} trx
 * @returns {number}
 */
export function deltaStokSaatHapus(trx) {
	if (!trx?.productId) return 0;
	return trx.kategoriTrx === 'MASUK' ? Number(trx.qty || 1) : 0;
}

/**
 * Label metode bayar. Form entry menyimpan ID akun kas (mis. "12"),
 * POS menyimpan nama metode (mis. "CASH", "QRIS").
 * @param {string|null} raw
 * @param {Record<string, string>} namaAkunById
 */
export function labelMetodeBayar(raw, namaAkunById = {}) {
	if (!raw) return 'KAS';
	const value = String(raw);
	if (/^\d+$/.test(value)) return namaAkunById[value] || 'Kas';
	return value;
}
