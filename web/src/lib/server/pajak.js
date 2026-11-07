/**
 * Pajak penjualan (PPN Keluaran) dan rekap PPN. Dipakai kasir (POS) dan laporan pajak.
 *  - Penjualan kena PPN : Dr Kas, Kr Pendapatan (tanpa PPN), Kr PPN Keluaran
 *  - Pembelian (modul Pengadaan) mencatat PPN Masukan di akun "PPN Masukan"
 */
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm';
import { chartOfAccounts, taxRates, journalEntries, journalEntryLines } from '$lib/server/schema';

/** Pembulatan rupiah (tanpa pecahan) */
const bulat = (/** @type {number} */ n) => Math.round(Number(n) || 0);

/**
 * Hitung PPN dari dasar transaksi.
 *  - EXCLUSIVE: harga belum termasuk PPN → total = dasar + PPN
 *  - INCLUSIVE: harga sudah termasuk PPN → total = dasar, PPN dipisahkan dari total
 * @param {number} dasar nilai setelah diskon
 * @param {number} persen tarif PPN, mis. 11
 * @param {'EXCLUSIVE' | 'INCLUSIVE'} mode
 * @returns {{ ppn: number, total: number, dpp: number }} dpp = dasar pengenaan pajak
 */
export function hitungPpn(dasar, persen, mode = 'EXCLUSIVE') {
	const d = Math.max(0, bulat(dasar));
	const p = Math.max(0, Number(persen) || 0);
	if (d === 0 || p === 0) return { ppn: 0, total: d, dpp: d };
	if (mode === 'INCLUSIVE') {
		const ppn = bulat((d * p) / (100 + p));
		return { ppn, total: d, dpp: d - ppn };
	}
	const ppn = bulat((d * p) / 100);
	return { ppn, total: d + ppn, dpp: d };
}

/**
 * Tarif PPN aktif unit: yang ditandai default dulu, kalau tidak ada ambil PPN aktif pertama.
 * @param {any} db @param {number} unitId
 * @returns {Promise<{ id: number, namaPajak: string, persentase: number } | null>}
 */
export async function tarifPpnAktif(db, unitId) {
	const baris = await db
		.select({ id: taxRates.id, namaPajak: taxRates.namaPajak, persentase: taxRates.persentase, isDefault: taxRates.isDefault })
		.from(taxRates)
		.where(and(eq(taxRates.unitId, unitId), eq(taxRates.tipe, 'PPN'), eq(taxRates.isActive, 1)));
	if (baris.length === 0) return null;
	const pilih = baris.find((/** @type {any} */ b) => Number(b.isDefault) === 1) || baris[0];
	return { id: pilih.id, namaPajak: pilih.namaPajak, persentase: Number(pilih.persentase) };
}

/** @param {{ kodeAkun: string }[]} akun @param {string} dasar */
function kodeKosong(akun, dasar) {
	const terpakai = new Set(akun.map((a) => a.kodeAkun));
	let hasil = dasar;
	for (let i = 1; terpakai.has(hasil); i++) hasil = `${dasar}-${i}`;
	return hasil;
}

const POLA_PPN_KELUARAN = /ppn keluaran|pajak keluaran|hutang ppn|utang ppn|ppn terutang/i;
const POLA_PPN_MASUKAN = /ppn masukan|pajak masukan/i;

/**
 * Akun PPN Keluaran (liabilitas) milik unit; dibuat otomatis kalau belum ada.
 * @param {any} tx @param {number} unitId
 * @returns {Promise<number>} id akun
 */
export async function pastikanAkunPpnKeluaran(tx, unitId) {
	/** @type {any[]} */
	const akun = await tx
		.select({ id: chartOfAccounts.id, kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)));
	const ada = akun.find((a) => a.tipeAkun.startsWith('LIABILITAS') && POLA_PPN_KELUARAN.test(a.namaAkun));
	if (ada) return ada.id;
	const [hasil] = await tx.insert(chartOfAccounts).values({
		unitId, kodeAkun: kodeKosong(akun, '2-10006'), namaAkun: 'PPN Keluaran', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT',
		deskripsi: 'PPN atas penjualan, disetor ke kas negara', isActive: 1
	});
	return hasil.insertId;
}

/**
 * Rekap PPN satu unit untuk rentang tanggal, dari saldo jurnal akun PPN.
 * kurangBayar > 0 → harus disetor; < 0 → lebih bayar (dikompensasi bulan berikutnya).
 * @param {any} db @param {number} unitId @param {string} dari YYYY-MM-DD @param {string} sampai YYYY-MM-DD
 */
export async function ringkasPpn(db, unitId, dari, sampai) {
	const akun = await db
		.select({ id: chartOfAccounts.id, namaAkun: chartOfAccounts.namaAkun })
		.from(chartOfAccounts)
		.where(eq(chartOfAccounts.unitId, unitId));
	const idKeluaran = akun.filter((/** @type {any} */ a) => POLA_PPN_KELUARAN.test(a.namaAkun)).map((/** @type {any} */ a) => a.id);
	const idMasukan = akun.filter((/** @type {any} */ a) => POLA_PPN_MASUKAN.test(a.namaAkun)).map((/** @type {any} */ a) => a.id);

	/** @param {number[]} ids */
	const saldo = async (ids) => {
		if (ids.length === 0) return { debit: 0, kredit: 0 };
		const [r] = await db
			.select({ debit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`, kredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)` })
			.from(journalEntryLines)
			.innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
			.where(and(eq(journalEntries.unitId, unitId), inArray(journalEntryLines.coaId, ids), gte(journalEntries.tanggal, dari), lte(journalEntries.tanggal, sampai)));
		return { debit: Number(r?.debit || 0), kredit: Number(r?.kredit || 0) };
	};
	const k = await saldo(idKeluaran);
	const m = await saldo(idMasukan);
	const keluaran = bulat(k.kredit - k.debit); // penjualan menambah kredit; retur mengurangi
	const masukan = bulat(m.debit - m.kredit);  // pembelian menambah debit; retur pembelian mengurangi
	return { keluaran, masukan, kurangBayar: keluaran - masukan };
}
