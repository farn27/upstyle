/**
 * Export & import data — SATU logika untuk web (produk/import, api/export/*) dan API mobile
 * (/api/app/export, /api/app/import). Semua dibatasi ke unit pemilik.
 *
 * Jenis data: products (produk), finance (transaksi), customers (kontak CRM).
 */
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { products, kategoriProduk, transaksi, crmContacts } from '$lib/server/schema';
import { exportProdukExcel, exportTransaksiExcel } from '$lib/server/excelExport.js';
import { generateLaporanPDF } from '$lib/server/pdfGenerator.js';

export class ImporEksporError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 422) {
		super(message);
		this.name = 'ImporEksporError';
		this.status = status;
	}
}

export const JENIS_DATA = ['products', 'finance', 'customers'];
export const FORMAT = ['excel', 'csv', 'pdf'];
const MAKS_BARIS_IMPOR = 2000;

// ─── Baca file ────────────────────────────────────────────────────────────

/** @param {Buffer} buffer @returns {Record<string, any>[]} */
export function bacaBarisFile(buffer) {
	let wb;
	try {
		wb = XLSX.read(buffer, { type: 'buffer' });
	} catch {
		throw new ImporEksporError('Gagal membaca file. Pastikan file .xlsx atau .csv valid.', 400);
	}
	const sheet = wb.SheetNames[0] ? wb.Sheets[wb.SheetNames[0]] : null;
	if (!sheet) throw new ImporEksporError('File tidak memiliki sheet yang valid.', 400);
	return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/** @param {string} base64 */
export function bacaBase64(base64) {
	const bersih = String(base64 || '').replace(/^data:[^,]*,/, '');
	if (!bersih) throw new ImporEksporError('File kosong', 400);
	const buf = Buffer.from(bersih, 'base64');
	if (buf.length > 5 * 1024 * 1024) throw new ImporEksporError('File maksimal 5 MB', 413);
	return buf;
}

const teks = (/** @type {any} */ v) => (v === undefined || v === null ? '' : String(v).trim());
const angka = (/** @type {any} */ v, d = 0) => {
	const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
	return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : d;
};

/** Kolom yang dikenali (huruf kecil) — sama dengan import web */
export function normalisasiProduk(/** @type {Record<string, any>} */ row) {
	const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toString().trim().toLowerCase(), v]));
	const status = teks(r.status).toLowerCase();
	return {
		nama: teks(r.nama ?? r.name),
		sku: teks(r.sku),
		kategori: teks(r.kategori ?? r.category),
		hargaBeli: angka(r.harga_beli ?? r.hargabeli ?? r.purchase_price),
		hargaJual: angka(r.harga_jual ?? r.hargajual ?? r.sale_price),
		stok: Math.trunc(angka(r.stok ?? r.stock)),
		minStok: Math.trunc(angka(r.min_stok ?? r.minstok ?? r.min_stock, 5)),
		barcode: teks(r.barcode),
		status: ['active', 'draft', 'archived'].includes(status) ? status : 'active'
	};
}

export function normalisasiPelanggan(/** @type {Record<string, any>} */ row) {
	const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toString().trim().toLowerCase(), v]));
	return {
		nama: teks(r.nama ?? r.name ?? r.nama_pelanggan),
		telepon: teks(r.telepon ?? r.phone ?? r.hp ?? r.no_hp),
		email: teks(r.email),
		perusahaan: teks(r.perusahaan ?? r.company)
	};
}

/**
 * Cek file sebelum diimpor (tanpa menulis apa pun).
 * @param {'products' | 'customers'} dataType @param {Record<string, any>[]} rows
 */
export function validasiImpor(dataType, rows) {
	/** @type {string[]} */
	const errors = [];
	if (!['products', 'customers'].includes(dataType)) {
		return { isValid: false, totalRows: 0, errors: ['Import hanya untuk produk atau pelanggan'], suggestedMapping: {} };
	}
	if (rows.length === 0) errors.push('File kosong atau tidak berisi baris data');
	if (rows.length > MAKS_BARIS_IMPOR) errors.push(`Maksimal ${MAKS_BARIS_IMPOR} baris sekali import`);
	const kolom = Object.keys(rows[0] || {}).map((k) => k.trim().toLowerCase());
	const norm = dataType === 'products' ? normalisasiProduk : normalisasiPelanggan;
	rows.forEach((row, i) => {
		const n = norm(row);
		if (!n.nama) errors.push(`Baris ${i + 2}: kolom nama kosong`);
		if (dataType === 'products' && /** @type {any} */ (n).hargaJual < 0) errors.push(`Baris ${i + 2}: harga jual negatif`);
	});
	/** @type {Record<string, string>} */
	const suggestedMapping = {};
	const peta = dataType === 'products'
		? { nama: ['nama', 'name'], harga_jual: ['harga_jual', 'hargajual', 'sale_price'], harga_beli: ['harga_beli', 'hargabeli', 'purchase_price'], stok: ['stok', 'stock'], kategori: ['kategori', 'category'], sku: ['sku'] }
		: { nama: ['nama', 'name', 'nama_pelanggan'], telepon: ['telepon', 'phone', 'hp', 'no_hp'], email: ['email'], perusahaan: ['perusahaan', 'company'] };
	for (const [tujuan, alias] of Object.entries(peta)) {
		const ketemu = kolom.find((k) => alias.includes(k));
		if (ketemu) suggestedMapping[ketemu] = tujuan;
	}
	if (!Object.values(suggestedMapping).includes('nama')) errors.unshift('Kolom "nama" tidak ditemukan di baris judul');
	return { isValid: errors.length === 0, totalRows: rows.length, errors: errors.slice(0, 50), suggestedMapping };
}

// ─── Import ───────────────────────────────────────────────────────────────

const slugDari = (/** @type {string} */ t) =>
	t.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

/**
 * @param {any} db @param {{ userId: number, unitId: number, rows: Record<string, any>[] }} input
 * @returns {Promise<{ totalRows: number, successRows: number, failedRows: number, errors: string[] }>}
 */
export async function imporProduk(db, { userId, unitId, rows }) {
	if (rows.length > MAKS_BARIS_IMPOR) throw new ImporEksporError(`Maksimal ${MAKS_BARIS_IMPOR} baris sekali import`);
	const data = rows.map(normalisasiProduk);
	/** @type {string[]} */
	const errors = [];
	let sukses = 0;
	/** @type {Map<string, number>} */
	const cacheKategori = new Map();
	await db.transaction(async (/** @type {any} */ tx) => {
		for (const [i, row] of data.entries()) {
			if (!row.nama) { errors.push(`Baris ${i + 2}: kolom nama kosong`); continue; }
			let kategoriId = null;
			if (row.kategori) {
				const kunci = row.kategori.toLowerCase();
				if (cacheKategori.has(kunci)) kategoriId = cacheKategori.get(kunci);
				else {
					// kategori dicari di unit ini saja (dulu lintas unit) dan dibuat dengan unitId
					const ada = await tx.query.kategoriProduk.findFirst({
						where: and(eq(kategoriProduk.unitId, unitId), eq(kategoriProduk.namaKategori, row.kategori)),
						columns: { id: true }
					});
					if (ada) kategoriId = ada.id;
					else {
						const [baru] = await tx.insert(kategoriProduk).values({ unitId, namaKategori: row.kategori });
						kategoriId = baru.insertId;
					}
					cacheKategori.set(kunci, kategoriId);
				}
			}
			const dasar = slugDari(row.nama) || `produk-${crypto.randomUUID().slice(0, 5)}`;
			let slug = dasar;
			for (let n = 1; await tx.query.products.findFirst({ where: eq(products.slug, slug), columns: { id: true } }); n++) slug = `${dasar}-${n}`;
			await tx.insert(products).values({
				id: crypto.randomUUID(),
				userId,
				unitId,
				kategoriId,
				nama: row.nama,
				sku: row.sku || `SKU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
				slug,
				barcode: row.barcode || null,
				status: row.status,
				hargaBeli: String(row.hargaBeli),
				hargaJual: String(row.hargaJual),
				stok: row.stok,
				minStok: row.minStok,
				metadata: { imported: true },
				hasVariant: 0
			});
			sukses++;
		}
	});
	return { totalRows: rows.length, successRows: sukses, failedRows: rows.length - sukses, errors: errors.slice(0, 50) };
}

/**
 * Import pelanggan sebagai kontak CRM.
 * @param {any} db @param {{ userId: number, unitId: number, rows: Record<string, any>[] }} input
 */
export async function imporPelanggan(db, { userId, unitId, rows }) {
	if (rows.length > MAKS_BARIS_IMPOR) throw new ImporEksporError(`Maksimal ${MAKS_BARIS_IMPOR} baris sekali import`);
	/** @type {string[]} */
	const errors = [];
	const valid = [];
	for (const [i, row] of rows.map(normalisasiPelanggan).entries()) {
		if (!row.nama) { errors.push(`Baris ${i + 2}: kolom nama kosong`); continue; }
		valid.push({ ownerId: userId, unitId, nama: row.nama.slice(0, 150), telepon: row.telepon || null, email: row.email || null, perusahaan: row.perusahaan || null, sumber: 'import' });
	}
	if (valid.length > 0) await db.insert(crmContacts).values(valid);
	return { totalRows: rows.length, successRows: valid.length, failedRows: rows.length - valid.length, errors: errors.slice(0, 50) };
}

// ─── Export ───────────────────────────────────────────────────────────────

/** @param {string[]} kolom @param {any[][]} baris */
function keCsv(kolom, baris) {
	const sel = (/** @type {any} */ v) => {
		const s = v === null || v === undefined ? '' : String(v);
		return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	// BOM supaya Excel membaca UTF-8 dengan benar
	return Buffer.from('﻿' + [kolom, ...baris].map((r) => r.map(sel).join(',')).join('\n'), 'utf8');
}

/** @param {string} judul @param {string[]} kolom @param {any[][]} baris */
function keXlsx(judul, kolom, baris) {
	const ws = XLSX.utils.aoa_to_sheet([kolom, ...baris]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, judul.slice(0, 31));
	return /** @type {Buffer} */ (XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

const JENIS_FILE = {
	excel: { ext: 'xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	csv: { ext: 'csv', type: 'text/csv; charset=utf-8' },
	pdf: { ext: 'pdf', type: 'application/pdf' }
};

/**
 * @param {any} db
 * @param {{ unitId: number, unitName: string, dataType: string, format: string, startDate?: string | null, endDate?: string | null }} input
 * @returns {Promise<{ buffer: Buffer, contentType: string, fileName: string, recordCount: number }>}
 */
export async function buatFileEkspor(db, { unitId, unitName, dataType, format, startDate, endDate }) {
	if (!JENIS_DATA.includes(dataType)) throw new ImporEksporError(`Jenis data harus: ${JENIS_DATA.join(', ')}`);
	if (!FORMAT.includes(format)) throw new ImporEksporError(`Format harus: ${FORMAT.join(', ')}`);
	if (format === 'pdf' && dataType !== 'finance') throw new ImporEksporError('PDF hanya untuk laporan keuangan');
	const tgl = (/** @type {any} */ v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);
	const dari = tgl(startDate);
	const sampai = tgl(endDate);
	const stempel = new Date().toISOString().slice(0, 10);
	const namaFile = `${dataType}-${slugDari(unitName) || unitId}-${stempel}.${JENIS_FILE[/** @type {'excel'|'csv'|'pdf'} */ (format)].ext}`;
	const contentType = JENIS_FILE[/** @type {'excel'|'csv'|'pdf'} */ (format)].type;

	if (dataType === 'products') {
		const list = await db
			.select({ sku: products.sku, nama: products.nama, kategori: kategoriProduk.namaKategori, hargaBeli: products.hargaBeli, hargaJual: products.hargaJual, stok: products.stok, minStok: products.minStok, status: products.status })
			.from(products)
			.leftJoin(kategoriProduk, eq(kategoriProduk.id, products.kategoriId))
			.where(and(eq(products.unitId, unitId), isNull(products.deletedAt)));
		const buffer = format === 'excel'
			? await exportProdukExcel({ unitName, products: list })
			: keCsv(['sku', 'nama', 'kategori', 'harga_beli', 'harga_jual', 'stok', 'min_stok', 'status'],
				list.map((/** @type {any} */ p) => [p.sku, p.nama, p.kategori, Number(p.hargaBeli || 0), Number(p.hargaJual || 0), p.stok, p.minStok, p.status]));
		return { buffer, contentType, fileName: namaFile, recordCount: list.length };
	}

	if (dataType === 'finance') {
		const syarat = [eq(transaksi.unitId, unitId)];
		if (dari) syarat.push(gte(transaksi.tanggal, `${dari} 00:00:00`));
		if (sampai) syarat.push(lte(transaksi.tanggal, `${sampai} 23:59:59`));
		const list = await db.select().from(transaksi).where(and(...syarat)).orderBy(desc(transaksi.tanggal)).limit(5000);
		const trx = list.map((/** @type {any} */ t) => ({ ...t, nominal: Number(t.nominal || 0), tanggal: t.tanggal || '' }));
		const periode = dari || sampai ? `${dari || '…'} s/d ${sampai || '…'}` : 'Semua';
		let buffer;
		if (format === 'excel') buffer = await exportTransaksiExcel({ unitName, transactions: trx, periode });
		else if (format === 'pdf') {
			const masuk = trx.filter((/** @type {any} */ t) => t.kategoriTrx === 'MASUK').reduce((/** @type {number} */ s, /** @type {any} */ t) => s + t.nominal, 0);
			const keluar = trx.filter((/** @type {any} */ t) => t.kategoriTrx === 'KELUAR').reduce((/** @type {number} */ s, /** @type {any} */ t) => s + t.nominal, 0);
			buffer = Buffer.from(await generateLaporanPDF({ unitName, periode, masuk, keluar, laba: masuk - keluar, transactions: trx }));
		} else {
			buffer = keCsv(['tanggal', 'kategori', 'keterangan', 'nominal', 'metode_bayar'],
				trx.map((/** @type {any} */ t) => [t.tanggal, t.kategoriTrx, t.keterangan, t.nominal, t.metodeBayar]));
		}
		return { buffer, contentType, fileName: namaFile, recordCount: trx.length };
	}

	// customers = kontak CRM
	const list = await db.select().from(crmContacts).where(eq(crmContacts.unitId, unitId)).orderBy(desc(crmContacts.id));
	const kolom = ['nama', 'telepon', 'email', 'perusahaan', 'stage', 'sumber'];
	const baris = list.map((/** @type {any} */ c) => [c.nama, c.telepon || '', c.email || '', c.perusahaan || '', c.stage || '', c.sumber || '']);
	const buffer = format === 'excel' ? keXlsx('Pelanggan', kolom, baris) : keCsv(kolom, baris);
	return { buffer, contentType, fileName: namaFile, recordCount: list.length };
}
