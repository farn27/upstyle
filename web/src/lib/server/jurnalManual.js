/**
 * Jurnal umum manual — satu logika untuk web (/finance/[slug]/jurnal-umum ?/create) dan mobile
 * (POST /api/app/finance/journal).
 *
 * Dulu versi web memakai tx.execute(string, params); Drizzle mengabaikan parameternya sehingga
 * kueri berisi "?" tanpa nilai dan jurnal manual web SELALU gagal. Versi web juga tidak memeriksa
 * akun milik unit dan periode tutup buku.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { chartOfAccounts, journalEntries, journalEntryLines } from '$lib/server/schema';
import { TransaksiError } from '$lib/server/catatTransaksi';
import { pastikanPeriodeTerbuka } from '$lib/server/periodeTutup';

/**
 * @param {any} db
 * @param {{ unitId: number, userId: number | string, tanggal: string, memo?: string | null, referensi?: string | null,
 *   lines: { coaId: number | string, debit?: number | string, kredit?: number | string, keterangan?: string | null }[] }} input
 * @returns {Promise<{ id: number, nomorJurnal: string, tanggal: string, totalDebit: number, totalKredit: number }>}
 */
export async function buatJurnalManual(db, input) {
	const unitId = Number(input.unitId);
	const tanggal = String(input.tanggal || '').slice(0, 10);
	const memo = input.memo ? String(input.memo).slice(0, 255) : null;
	const referensi = input.referensi ? String(input.referensi).slice(0, 100) : null;
	const lines = Array.isArray(input.lines) ? input.lines : [];

	if (!unitId || !tanggal || lines.length === 0) throw new TransaksiError('Data input tidak lengkap (tanggal dan baris jurnal wajib diisi)', 400);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(tanggal))) throw new TransaksiError('Format tanggal harus YYYY-MM-DD', 400);
	if (lines.length < 2) throw new TransaksiError('Jurnal minimal harus memiliki 2 baris (debit & kredit)', 400);

	const bersih = lines.map((l) => {
		const d = Number(l.debit || 0);
		const k = Number(l.kredit || 0);
		if (!(Number(l.coaId) > 0)) throw new TransaksiError('Setiap baris harus memilih akun', 400);
		if (!Number.isFinite(d) || !Number.isFinite(k) || d < 0 || k < 0) throw new TransaksiError('Nominal tidak boleh negatif atau bukan angka', 400);
		if (d > 0 && k > 0) throw new TransaksiError('Satu baris hanya boleh diisi debit ATAU kredit', 400);
		if (d === 0 && k === 0) throw new TransaksiError('Setiap baris harus berisi nominal debit atau kredit', 400);
		return { coaId: Number(l.coaId), debit: d, kredit: k, keterangan: String(l.keterangan || memo || '').slice(0, 255) };
	});

	// Semua akun harus milik unit ini (cegah merujuk akun unit/tenant lain)
	const idAkun = [...new Set(bersih.map((l) => l.coaId))];
	const akunSah = await db
		.select({ id: chartOfAccounts.id })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), inArray(chartOfAccounts.id, idAkun)));
	if (akunSah.length !== idAkun.length) throw new TransaksiError('Ada akun yang bukan milik unit ini', 400);

	const totalDebit = Math.round(bersih.reduce((a, l) => a + l.debit, 0) * 100) / 100;
	const totalKredit = Math.round(bersih.reduce((a, l) => a + l.kredit, 0) * 100) / 100;
	if (Math.abs(totalDebit - totalKredit) > 0.001) {
		throw new TransaksiError(`Total debit (${totalDebit}) dan total kredit (${totalKredit}) harus seimbang`, 400);
	}
	if (totalDebit <= 0) throw new TransaksiError('Nominal debit dan kredit harus lebih dari 0', 400);

	await pastikanPeriodeTerbuka(db, unitId, tanggal);

	return db.transaction(async (/** @type {any} */ tx) => {
		const tahun = Number(tanggal.slice(0, 4));
		const [hitung] = await tx
			.select({ n: sql`COUNT(*)` })
			.from(journalEntries)
			.where(and(eq(journalEntries.unitId, unitId), sql`YEAR(${journalEntries.tanggal}) = ${tahun}`));
		const nomorJurnal = `JRN-${tahun}-${String(Number(hitung?.n || 0) + 1).padStart(4, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

		const [hasil] = await tx.insert(journalEntries).values({
			unitId,
			userId: /** @type {any} */ (input.userId),
			tanggal,
			nomorJurnal,
			referensi,
			memo,
			status: 'POSTED',
			totalDebit: String(totalDebit),
			totalKredit: String(totalKredit),
			sourceType: 'MANUAL',
			sourceId: null
		});
		const id = Number(hasil.insertId);
		await tx.insert(journalEntryLines).values(
			bersih.map((l) => ({ journalId: id, coaId: l.coaId, keterangan: l.keterangan, debit: String(l.debit), kredit: String(l.kredit) }))
		);
		return { id, nomorJurnal, tanggal, totalDebit, totalKredit };
	});
}
