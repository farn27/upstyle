/**
 * Master data keuangan — SATU logika untuk halaman web (finance/[slug]/master-data/*)
 * dan API mobile (/api/app/finance/*). Semua operasi dibatasi ke unitId pemilik.
 */
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { fixedAssets, taxRates, budgetItems, chartOfAccounts } from '$lib/server/schema';
import { DEFAULT_COAS } from '$lib/server/defaultCoa';

export class MasterDataError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 422) {
		super(message);
		this.name = 'MasterDataError';
		this.status = status;
	}
}

/** @param {import('zod').ZodSafeParseResult<any>} hasil */
function pesanZod(hasil) {
	return hasil.error?.issues?.[0]?.message || 'Input tidak valid';
}

/** Kosong / null / undefined → undefined supaya field tidak ikut diubah */
const opsional = (/** @type {import('zod').ZodTypeAny} */ s) =>
	z.preprocess((v) => (v === '' || v === null ? undefined : v), s.optional());

/** COA harus milik unit (atau null) */
async function cekCoa(/** @type {any} */ db, /** @type {number} */ unitId, /** @type {number | null | undefined} */ coaId) {
	if (!coaId) return;
	const ada = await db.query.chartOfAccounts.findFirst({
		where: and(eq(chartOfAccounts.id, coaId), eq(chartOfAccounts.unitId, unitId)),
		columns: { id: true }
	});
	if (!ada) throw new MasterDataError('Akun COA tidak ditemukan di unit ini', 404);
}

// ─── Aset tetap ───────────────────────────────────────────────────────────

const asetSchema = z.object({
	namaAset: opsional(z.string().min(1).max(150)),
	kategori: opsional(z.enum(['TANAH', 'BANGUNAN', 'KENDARAAN', 'MESIN', 'INVENTARIS', 'LAINNYA'])),
	nilaiPerolehan: opsional(z.coerce.number().positive()),
	tanggalPerolehan: opsional(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD')),
	umurEkonomis: opsional(z.coerce.number().int().positive()),
	metodePenyusutan: opsional(z.enum(['GARIS_LURUS', 'SALDO_MENURUN'])),
	nilaiSisa: opsional(z.coerce.number().min(0)),
	status: opsional(z.enum(['AKTIF', 'DIJUAL', 'DINONAKTIFKAN'])),
	coaId: z.preprocess((v) => (v === '' || v === undefined ? undefined : v === null ? null : Number(v)), z.number().int().positive().nullable().optional()),
	keterangan: z.string().max(5000).nullable().optional()
});

/**
 * @param {any} db @param {number} unitId @param {number} id @param {Record<string, unknown>} input
 */
export async function ubahAset(db, unitId, id, input) {
	const hasil = asetSchema.safeParse(input);
	if (!hasil.success) throw new MasterDataError(pesanZod(hasil));
	/** @type {Record<string, any>} */
	const ubah = {};
	for (const [k, v] of Object.entries(hasil.data)) {
		if (v === undefined) continue;
		ubah[k] = k === 'nilaiPerolehan' || k === 'nilaiSisa' ? String(v) : k === 'tanggalPerolehan' ? String(v).slice(0, 10) : v;
	}
	if (Object.keys(ubah).length === 0) throw new MasterDataError('Tidak ada data yang diubah', 400);
	await cekCoa(db, unitId, ubah.coaId);
	const [r] = await db.update(fixedAssets).set(ubah).where(and(eq(fixedAssets.id, id), eq(fixedAssets.unitId, unitId)));
	if (!r?.affectedRows) throw new MasterDataError('Aset tidak ditemukan', 404);
}

/** @param {any} db @param {number} unitId @param {number} id */
export async function hapusAset(db, unitId, id) {
	const [r] = await db.delete(fixedAssets).where(and(eq(fixedAssets.id, id), eq(fixedAssets.unitId, unitId)));
	if (!r?.affectedRows) throw new MasterDataError('Aset tidak ditemukan', 404);
}

// ─── Pajak ────────────────────────────────────────────────────────────────

const flag = z.preprocess((v) => (v === 'on' || v === true || v === 'true' || v === 1 || v === '1' ? 1 : v === undefined || v === '' ? undefined : 0), z.number().optional());

const pajakSchema = z.object({
	namaPajak: opsional(z.string().min(1).max(100)),
	persentase: opsional(z.coerce.number().min(0).max(100)),
	tipe: opsional(z.enum(['PPN', 'PPH', 'LAINNYA'])),
	isDefault: flag,
	isActive: flag,
	coaId: z.preprocess((v) => (v === '' || v === undefined ? undefined : v === null ? null : Number(v)), z.number().int().positive().nullable().optional())
});

/**
 * @param {any} db @param {number} unitId @param {number} id @param {Record<string, unknown>} input
 */
export async function ubahPajak(db, unitId, id, input) {
	const hasil = pajakSchema.safeParse(input);
	if (!hasil.success) throw new MasterDataError(pesanZod(hasil));
	/** @type {Record<string, any>} */
	const ubah = {};
	for (const [k, v] of Object.entries(hasil.data)) {
		if (v === undefined) continue;
		ubah[k] = k === 'persentase' ? String(v) : v;
	}
	if (Object.keys(ubah).length === 0) throw new MasterDataError('Tidak ada data yang diubah', 400);
	await cekCoa(db, unitId, ubah.coaId);
	const [r] = await db.update(taxRates).set(ubah).where(and(eq(taxRates.id, id), eq(taxRates.unitId, unitId)));
	if (!r?.affectedRows) throw new MasterDataError('Pajak tidak ditemukan', 404);
}

/** @param {any} db @param {number} unitId @param {number} id */
export async function hapusPajak(db, unitId, id) {
	const [r] = await db.delete(taxRates).where(and(eq(taxRates.id, id), eq(taxRates.unitId, unitId)));
	if (!r?.affectedRows) throw new MasterDataError('Pajak tidak ditemukan', 404);
}

// ─── Budget ───────────────────────────────────────────────────────────────

/** @param {any} db @param {number} unitId @param {number} id */
export async function hapusBudget(db, unitId, id) {
	const [r] = await db.delete(budgetItems).where(and(eq(budgetItems.id, id), eq(budgetItems.unitId, unitId)));
	if (!r?.affectedRows) throw new MasterDataError('Anggaran tidak ditemukan', 404);
}

// ─── COA standar ──────────────────────────────────────────────────────────

/** Template COA yang tersedia (kunci DEFAULT_COAS) */
export const TIPE_COA = Object.keys(DEFAULT_COAS);

/**
 * Isi COA standar sesuai jenis usaha. Gagal kalau unit sudah punya COA.
 * @param {any} db @param {number} unitId @param {string} [tipe]
 * @returns {Promise<number>} jumlah akun yang dibuat
 */
export async function isiCoaStandar(db, unitId, tipe) {
	const kunci = String(tipe || 'LAINNYA').toUpperCase();
	/** @type {any[] | undefined} */
	const template = /** @type {any} */ (DEFAULT_COAS)[kunci];
	if (!template) throw new MasterDataError(`Jenis COA tidak dikenal. Pilihan: ${TIPE_COA.join(', ')}`);
	const [{ jumlah }] = await db
		.select({ jumlah: sql`COUNT(*)` })
		.from(chartOfAccounts)
		.where(eq(chartOfAccounts.unitId, unitId));
	if (Number(jumlah) > 0) throw new MasterDataError('Unit sudah memiliki Chart of Accounts', 409);
	await db.insert(chartOfAccounts).values(template.map((c) => ({ ...c, unitId, isActive: 1 })));
	return template.length;
}
