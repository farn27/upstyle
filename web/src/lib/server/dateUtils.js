/**
 * dateUtils.js — Timezone-aware date helpers untuk Bizgrow
 *
 * Semua bisnis beroperasi dalam WIB (Asia/Jakarta, UTC+7).
 * Node.js default pakai timezone server (biasanya UTC di production).
 * Gunakan fungsi-fungsi ini SELALU untuk operasi tanggal di server-side.
 *
 * ATURAN:
 * - nowWIB()        → pengganti new Date() untuk insert ke DB
 * - todayStrWIB()   → pengganti new Date().toISOString().split('T')[0]
 * - thisMonthWIB()  → tahun & bulan saat ini di WIB
 * - lastMonthWIB()  → tahun & bulan lalu di WIB
 * - monthRangeWIB() → start/end date string untuk query SQL filter per-bulan
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 dalam milliseconds

/**
 * Dapatkan Date object yang mewakili waktu WIB saat ini.
 * HANYA untuk keperluan insert/display — jangan pakai untuk kalkulasi selisih waktu.
 * @returns {Date}
 */
export function nowWIB() {
	return new Date(); // Use standard UTC Date. Frontend will correctly parse and convert to local browser time (WIB).
}

/**
 * Dapatkan tanggal hari ini dalam format YYYY-MM-DD berdasarkan WIB.
 * Menggantikan: new Date().toISOString().split('T')[0]  ← SALAH (UTC)
 * @returns {string} e.g. "2026-07-03"
 */
export function todayStrWIB() {
	return new Date(Date.now() + WIB_OFFSET_MS).toISOString().split('T')[0];
}

/**
 * Dapatkan tahun & bulan saat ini berdasarkan WIB.
 * @returns {{ year: number, month: number }} month = 1-12
 */
export function thisMonthWIB() {
	const d = new Date(Date.now() + WIB_OFFSET_MS);
	return {
		year:  d.getUTCFullYear(),
		month: d.getUTCMonth() + 1
	};
}

/**
 * Dapatkan tahun & bulan LALU berdasarkan WIB.
 * @returns {{ year: number, month: number }}
 */
export function lastMonthWIB() {
	const { year, month } = thisMonthWIB();
	return month === 1
		? { year: year - 1, month: 12 }
		: { year, month: month - 1 };
}

/**
 * Dapatkan range tanggal (start, end) untuk filter SQL per-bulan tertentu.
 * @param {number} year
 * @param {number} month  1-12
 * @returns {{ start: string, end: string }}
 *   start = "YYYY-MM-01 00:00:00"
 *   end   = "YYYY-MM-last 23:59:59"
 */
export function monthRangeSQL(year, month) {
	const pad = n => String(n).padStart(2, '0');
	const lastDay = new Date(year, month, 0).getDate(); // month=0-indexed, day=0 → last day
	return {
		start: `${year}-${pad(month)}-01 00:00:00`,
		end:   `${year}-${pad(month)}-${pad(lastDay)} 23:59:59`
	};
}

/**
 * Dapatkan range tanggal (start, end) untuk filter SQL bulan INI (WIB).
 * @returns {{ start: string, end: string }}
 */
export function thisMonthRangeSQL() {
	const { year, month } = thisMonthWIB();
	return monthRangeSQL(year, month);
}

/**
 * Dapatkan range tanggal (start, end) untuk filter SQL bulan LALU (WIB).
 * @returns {{ start: string, end: string }}
 */
export function lastMonthRangeSQL() {
	const { year, month } = lastMonthWIB();
	return monthRangeSQL(year, month);
}

/**
 * Format tahun & bulan jadi label bahasa Indonesia.
 * @param {number} year
 * @param {number} month  1-12
 * @returns {string} e.g. "Juli 2026"
 */
export function formatMonthID(year, month) {
	const names = ['','Januari','Februari','Maret','April','Mei','Juni',
	               'Juli','Agustus','September','Oktober','November','Desember'];
	return `${names[month]} ${year}`;
}
