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

/**
 * Tambah aset tetap (web). Field wajib divalidasi; COA harus milik unit.
 * @param {any} db @param {number} unitId @param {Record<string, unknown>} input
 */
export async function buatAset(db, unitId, input) {
	const wajib = asetSchema.required({ namaAset: true, nilaiPerolehan: true, tanggalPerolehan: true, umurEkonomis: true });
	const hasil = wajib.safeParse({ kategori: 'LAINNYA', metodePenyusutan: 'GARIS_LURUS', nilaiSisa: 0, ...input, coaId: input.coaId || null });
	if (!hasil.success) throw new MasterDataError('Lengkapi nama aset, nilai perolehan (> 0), tanggal perolehan, dan umur ekonomis');
	const d = hasil.data;
	if (Number(d.nilaiSisa || 0) > Number(d.nilaiPerolehan)) throw new MasterDataError('Nilai sisa tidak boleh melebihi nilai perolehan');
	await cekCoa(db, unitId, d.coaId);
	const [r] = await db.insert(fixedAssets).values({
		unitId,
		namaAset: d.namaAset,
		kategori: d.kategori,
		nilaiPerolehan: String(d.nilaiPerolehan),
		tanggalPerolehan: String(d.tanggalPerolehan).slice(0, 10),
		umurEkonomis: d.umurEkonomis,
		metodePenyusutan: d.metodePenyusutan,
		nilaiSisa: String(d.nilaiSisa || 0),
		nilaiBuku: String(d.nilaiPerolehan),
		status: 'AKTIF',
		coaId: d.coaId ?? null
	});
	return Number(r.insertId);
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

/**
 * Tambah tarif pajak (web).
 * @param {any} db @param {number} unitId @param {Record<string, unknown>} input
 */
export async function buatPajak(db, unitId, input) {
	const wajib = pajakSchema.required({ namaPajak: true, persentase: true, tipe: true });
	const hasil = wajib.safeParse({ ...input, coaId: input.coaId || null });
	if (!hasil.success) throw new MasterDataError('Lengkapi nama pajak, persentase (0–100), dan jenis pajak');
	const d = hasil.data;
	await cekCoa(db, unitId, d.coaId);
	const [r] = await db.insert(taxRates).values({
		unitId, namaPajak: d.namaPajak, persentase: String(d.persentase), tipe: d.tipe,
		isDefault: d.isDefault ?? 0, isActive: 1, coaId: d.coaId ?? null
	});
	return Number(r.insertId);
}

/**
 * Tambah anggaran (web budgeting).
 * @param {any} db @param {number} unitId @param {Record<string, unknown>} input
 */
export async function buatBudget(db, unitId, input) {
	const hasil = z.object({
		coaId: z.coerce.number().int().positive(),
		tahun: z.coerce.number().int().min(2000).max(2100),
		bulan: z.coerce.number().int().min(1).max(12),
		nominal: z.coerce.number().min(0),
		keterangan: z.string().max(500).nullable().optional()
	}).safeParse({ ...input, keterangan: input.keterangan ? String(input.keterangan) : null });
	if (!hasil.success) throw new MasterDataError('Lengkapi akun, tahun, bulan (1–12), dan nominal anggaran');
	const d = hasil.data;
	await cekCoa(db, unitId, d.coaId);
	const [r] = await db.insert(budgetItems).values({ unitId, coaId: d.coaId, tahun: d.tahun, bulan: d.bulan, nominal: String(d.nominal), keterangan: d.keterangan ?? null });
	return Number(r.insertId);
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

// ─── COA otomatis dengan AI ───────────────────────────────────────────────

const TIPE_AKUN_VALID = [
	'ASET_LANCAR', 'ASET_TETAP', 'LIABILITAS_LANCAR', 'LIABILITAS_JANGKA_PANJANG', 'EKUITAS',
	'PENDAPATAN', 'HPP', 'BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'PENDAPATAN_LAINNYA'
];
/** Awalan kode per jenis akun (sesuai konvensi 1xxx aset, 2xxx liabilitas, dst.) */
const AWALAN_KODE = {
	ASET_LANCAR: '1', ASET_TETAP: '1', LIABILITAS_LANCAR: '2', LIABILITAS_JANGKA_PANJANG: '2', EKUITAS: '3',
	PENDAPATAN: '4', HPP: '5', BEBAN_OPERASIONAL: '6', BEBAN_LAINNYA: '7', PENDAPATAN_LAINNYA: '8'
};
const NORMAL_DEBIT = new Set(['ASET_LANCAR', 'ASET_TETAP', 'HPP', 'BEBAN_OPERASIONAL', 'BEBAN_LAINNYA']);
const ALIAS_TIPE = { ASET_LAINNYA: 'ASET_TETAP', ASET: 'ASET_LANCAR', LIABILITAS: 'LIABILITAS_LANCAR', BEBAN: 'BEBAN_OPERASIONAL', HARGA_POKOK_PENJUALAN: 'HPP', MODAL: 'EKUITAS' };

/**
 * Ambil array akun dari jawaban AI (toleran terhadap markdown / teks pembuka).
 * @param {string} teks
 * @returns {any[]}
 */
export function bacaAkunDariAi(teks) {
	const bersih = String(teks || '').replace(/```json/gi, '').replace(/```/g, '').trim();
	const awal = bersih.indexOf('[');
	const akhir = bersih.lastIndexOf(']');
	if (awal < 0 || akhir <= awal) return [];
	try {
		const arr = JSON.parse(bersih.slice(awal, akhir + 1));
		return Array.isArray(arr) ? arr : [];
	} catch {
		return [];
	}
}

/**
 * Rapikan akun dari AI: tipe valid, saldo normal mengikuti tipe, kode unik, tanpa duplikat nama.
 * @param {any[]} mentah @param {Set<string>} kodeTerpakai @param {Set<string>} namaTerpakai
 */
export function rapikanAkunAi(mentah, kodeTerpakai, namaTerpakai) {
	const kode = new Set(kodeTerpakai);
	const nama = new Set([...namaTerpakai].map((n) => n.toLowerCase()));
	/** @type {Record<string, number>} */
	const urut = {};
	/** @type {{ kodeAkun: string, namaAkun: string, tipeAkun: string, normalBalance: string, deskripsi: string }[]} */
	const hasil = [];
	for (const a of mentah) {
		if (!a || typeof a !== 'object') continue;
		const namaAkun = String(a.namaAkun || '').trim().slice(0, 150);
		if (namaAkun.length < 2 || nama.has(namaAkun.toLowerCase())) continue;
		let tipe = String(a.tipeAkun || '').toUpperCase().replace(/\s+/g, '_');
		tipe = /** @type {any} */ (ALIAS_TIPE)[tipe] || tipe;
		if (!TIPE_AKUN_VALID.includes(tipe)) continue;
		let kodeAkun = String(a.kodeAkun || '').trim().slice(0, 20);
		const awalan = /** @type {any} */ (AWALAN_KODE)[tipe];
		if (!kodeAkun || kode.has(kodeAkun)) {
			let n = urut[awalan] ?? 1000;
			do { n += 1; kodeAkun = `${awalan}-${n}`; } while (kode.has(kodeAkun));
			urut[awalan] = n;
		}
		kode.add(kodeAkun);
		nama.add(namaAkun.toLowerCase());
		hasil.push({
			kodeAkun, namaAkun, tipeAkun: tipe,
			normalBalance: NORMAL_DEBIT.has(tipe) ? 'DEBIT' : 'KREDIT',
			deskripsi: String(a.deskripsi || '').trim().slice(0, 500)
		});
	}
	return hasil;
}

const PROMPT_COA = `Anda ahli akuntansi Indonesia. Buat Chart of Accounts (bagan akun) untuk bisnis yang dideskripsikan pengguna.
Balas HANYA array JSON murni (tanpa markdown, tanpa teks lain). Setiap elemen:
{"kodeAkun":"1-1001","namaAkun":"Kas","tipeAkun":"ASET_LANCAR","normalBalance":"DEBIT","deskripsi":"..."}
tipeAkun HARUS salah satu: ${TIPE_AKUN_VALID.join(', ')}.
Wajib ada minimal: akun kas/bank, piutang, persediaan (bila berdagang), hutang usaha, modal pemilik, pendapatan utama, HPP (bila berdagang), beban operasional umum (gaji, sewa, listrik, dll).
Buat 14-22 akun yang spesifik dan relevan dengan model bisnisnya. Kode memakai format 1-1001 (1 aset, 2 liabilitas, 3 ekuitas, 4 pendapatan, 5 HPP, 6 beban operasional, 7 beban lainnya, 8 pendapatan lainnya).`;

/**
 * Buat COA otomatis dari deskripsi bisnis memakai AI. Semua akun disimpan dalam satu transaksi.
 * Bila `tambahkan` true, hanya menambah akun yang belum ada (kode/nama berbeda) pada COA yang sudah ada.
 * @param {any} db @param {number} unitId @param {string} deskripsi
 * @param {{ tambahkan?: boolean, panggilAi: (prompt: string, deskripsi: string) => Promise<string> }} opsi
 * @returns {Promise<number>} jumlah akun dibuat
 */
export async function buatCoaDenganAi(db, unitId, deskripsi, opsi) {
	const uraian = String(deskripsi || '').trim();
	if (uraian.length < 3) throw new MasterDataError('Deskripsi bisnis wajib diisi (minimal 3 karakter)', 422);
	const ada = await db
		.select({ kode: chartOfAccounts.kodeAkun, nama: chartOfAccounts.namaAkun })
		.from(chartOfAccounts)
		.where(eq(chartOfAccounts.unitId, unitId));
	if (ada.length > 0 && !opsi.tambahkan) throw new MasterDataError('Unit sudah memiliki Chart of Accounts', 409);

	let jawaban = '';
	try {
		jawaban = await opsi.panggilAi(PROMPT_COA, `Deskripsi bisnis saya: ${uraian.slice(0, 500)}`);
	} catch (e) {
		throw new MasterDataError('AI tidak tersedia saat ini, coba lagi atau pakai template standar', 503);
	}
	const akun = rapikanAkunAi(bacaAkunDariAi(jawaban), new Set(ada.map((a) => a.kode)), new Set(ada.map((a) => a.nama)));
	if (akun.length === 0) throw new MasterDataError('AI belum menghasilkan akun yang valid, coba perjelas deskripsi bisnis', 422);
	await db.transaction(async (/** @type {any} */ tx) => {
		await tx.insert(chartOfAccounts).values(akun.map((a) => ({ ...a, unitId, isActive: 1 })));
	});
	return akun.length;
}
