/**
 * Modul Pengadaan — SATU logika bisnis untuk halaman web (finance/[slug]/pengadaan/*)
 * dan penerimaan lewat API mobile (/api/app/scm).
 *
 * Alur: Supplier → PO (DRAFT → SENT) → Penerimaan (stok masuk) → Tagihan (hutang + jurnal)
 *       → Pembayaran (kas keluar + jurnal) → Retur (stok keluar, potong hutang kalau sudah ditagih)
 *
 * Aturan akuntansi:
 *   Tagihan  : Dr Persediaan, Dr PPN Masukan, Kr Hutang Usaha
 *   Bayar    : Dr Hutang Usaha, Kr Kas/Bank (lewat catatTransaksi supaya masuk arus kas)
 *   Retur    : Dr Hutang Usaha, Kr Persediaan, Kr PPN Masukan (hanya barang yang sudah ditagih)
 *
 * Semua perubahan dokumen mengunci baris PO (FOR UPDATE) supaya klik ganda / dua pengguna
 * tidak bisa menerima atau menagih barang yang sama dua kali.
 */
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { and, asc, desc, eq, gte, inArray, isNull, like, sql } from 'drizzle-orm';
import {
	accountingContacts,
	chartOfAccounts,
	journalEntries,
	journalEntryLines,
	payables,
	products,
	purchaseInvoiceItems,
	purchaseInvoices,
	purchaseOrderItems,
	purchaseOrders,
	purchasePayments,
	purchaseReceiptItems,
	purchaseReceipts,
	purchaseReturnItems,
	purchaseReturns,
	riwayatAksi,
	stockLogs,
	suppliers,
	transaksi,
	unitBisnis
} from '$lib/server/schema';
import { catatTransaksi, pastikanCoaStandar } from '$lib/server/catatTransaksi';
import { todayStrWIB } from '$lib/server/dateUtils';
import {
	bulat,
	hargaRataRata,
	hitungPorsi,
	hitungTotalPO,
	nomorBerikut,
	sisaDiretur,
	sisaDiterima,
	sisaDitagih,
	statusHutang
} from '$lib/pengadaan';

/** Error yang aman ditampilkan ke pengguna */
export class PengadaanError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 422) {
		super(message);
		this.name = 'PengadaanError';
		this.status = status;
	}
}

/**
 * @typedef {{ unitId: number, userId: number }} Konteks
 */

/** @param {import('zod').ZodSafeParseResult<any>} hasil */
function dataValid(hasil) {
	if (!hasil.success) throw new PengadaanError(hasil.error.issues[0]?.message || 'Input tidak valid');
	return hasil.data;
}

const zTanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid');
const zUang = z.coerce.number().min(0, 'Nilai tidak boleh minus').max(999999999999, 'Nilai terlalu besar');
const zOpsional = (/** @type {number} */ maks) =>
	z.string().trim().max(maks, `Maksimal ${maks} karakter`).optional().nullable().transform((v) => v || null);

/** Jalankan fungsi; kalau nomor dokumen bentrok (dua pengguna bersamaan), coba lagi */
async function denganCobaUlangNomor(/** @type {() => Promise<any>} */ fn) {
	for (let percobaan = 0; ; percobaan++) {
		try {
			return await fn();
		} catch (err) {
			const kode = /** @type {any} */ (err)?.code ?? /** @type {any} */ (err)?.cause?.code;
			if (kode !== 'ER_DUP_ENTRY' || percobaan >= 3 || err instanceof PengadaanError) throw err;
		}
	}
}

/** @param {any} tx @param {any} tabel @param {any} kolom @param {string} awalan @param {any} [filter] */
async function nomorDokumen(tx, tabel, kolom, awalan, filter) {
	const syarat = like(kolom, `${awalan}%`);
	const [terakhir] = await tx
		.select({ nomor: kolom })
		.from(tabel)
		.where(filter ? and(filter, syarat) : syarat)
		.orderBy(desc(kolom))
		.limit(1);
	return nomorBerikut(awalan, terakhir?.nomor);
}

/** Awalan nomor per unit & bulan: "PO-12-2611-" @param {string} kode @param {number} unitId @param {string} tanggal */
const awalanNomor = (kode, unitId, tanggal) => `${kode}-${unitId}-${tanggal.slice(2, 4)}${tanggal.slice(5, 7)}-`;

/** @param {any} tx @param {Konteks} ctx @param {string} pesan @param {'success'|'info'} [tipe] @param {string} [link] */
async function catatRiwayat(tx, ctx, pesan, tipe = 'info', link) {
	await tx.insert(riwayatAksi).values({
		userId: ctx.userId,
		unitId: ctx.unitId,
		pesan,
		tipe,
		kategori: 'PENGADAAN',
		link: link || null
	});
}

// ─── Supplier ─────────────────────────────────────────────────────────────

/**
 * Isi kolom kontak: JSON (format API mobile) atau teks lama (dianggap telepon).
 * @param {string | null | undefined} kontak
 */
export function bacaKontak(kontak) {
	const kosong = { contactName: '', phone: '', email: '', category: '', address: '', npwp: '' };
	if (!kontak) return kosong;
	try {
		const isi = JSON.parse(kontak);
		if (isi && typeof isi === 'object') return { ...kosong, ...isi };
	} catch {
		/* teks biasa */
	}
	return { ...kosong, phone: kontak };
}

const supplierSchema = z.object({
	namaSupplier: z.string().trim().min(1, 'Nama supplier wajib diisi').max(150),
	contactName: zOpsional(100),
	phone: zOpsional(30),
	email: z.union([z.literal(''), z.string().trim().email('Format email tidak valid').max(100)]).optional().nullable(),
	category: zOpsional(100),
	address: zOpsional(300),
	npwp: zOpsional(30),
	termPembayaran: z.coerce.number().int().min(0, 'Termin tidak boleh minus').max(365).default(30)
});

/** @param {any} input */
function barisSupplier(input) {
	const d = dataValid(supplierSchema.safeParse(input));
	return {
		namaSupplier: d.namaSupplier,
		termPembayaran: d.termPembayaran,
		kontak: JSON.stringify({
			contactName: d.contactName || '',
			phone: d.phone || '',
			email: d.email || '',
			category: d.category || '',
			address: d.address || '',
			npwp: d.npwp || ''
		})
	};
}

/** @param {any} db @param {Konteks} ctx @param {any} input */
export async function buatSupplier(db, ctx, input) {
	const [hasil] = await db.insert(suppliers).values({ unitId: ctx.unitId, ...barisSupplier(input) });
	return hasil.insertId;
}

/** @param {any} db @param {Konteks} ctx @param {number} id */
async function supplierUnit(db, ctx, id) {
	const [baris] = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.unitId, ctx.unitId))).limit(1);
	if (!baris) throw new PengadaanError('Supplier tidak ditemukan', 404);
	return baris;
}

/** @param {any} db @param {Konteks} ctx @param {number} id @param {any} input */
export async function ubahSupplier(db, ctx, id, input) {
	const lama = await supplierUnit(db, ctx, id);
	const baris = barisSupplier(input);
	await db.update(suppliers).set(baris).where(eq(suppliers.id, lama.id));
	// Nama di daftar hutang ikut berubah
	if (lama.contactId) {
		const k = JSON.parse(baris.kontak);
		await db
			.update(accountingContacts)
			.set({ namaKontak: baris.namaSupplier, telepon: k.phone || null, email: k.email || null, alamat: k.address || null, npwp: k.npwp || null, termPembayaran: baris.termPembayaran })
			.where(and(eq(accountingContacts.id, lama.contactId), eq(accountingContacts.unitId, ctx.unitId)));
	}
}

/** @param {any} db @param {Konteks} ctx @param {number} id @param {boolean} aktif */
export async function aturAktifSupplier(db, ctx, id, aktif) {
	await supplierUnit(db, ctx, id);
	await db.update(suppliers).set({ isActive: aktif ? 1 : 0 }).where(eq(suppliers.id, id));
}

/**
 * Hapus hanya kalau belum pernah dipakai: PO punya FK cascade ke supplier,
 * jadi menghapus supplier yang punya PO akan ikut menghapus riwayat pembelian.
 * @param {any} db @param {Konteks} ctx @param {number} id
 */
export async function hapusSupplier(db, ctx, id) {
	await supplierUnit(db, ctx, id);
	const [{ jumlah }] = await db.select({ jumlah: sql`COUNT(*)` }).from(purchaseOrders).where(eq(purchaseOrders.supplierId, id));
	if (Number(jumlah) > 0) {
		throw new PengadaanError('Supplier sudah punya riwayat PO. Nonaktifkan saja agar riwayatnya tetap tersimpan.', 409);
	}
	await db.delete(suppliers).where(eq(suppliers.id, id));
}

// ─── Purchase Order ───────────────────────────────────────────────────────

const poSchema = z.object({
	supplierId: z.coerce.number({ error: 'Pilih supplier' }).int().positive('Pilih supplier'),
	expectedDate: z.union([z.literal(''), zTanggal]).optional().nullable(),
	notes: zOpsional(2000),
	diskon: zUang.default(0),
	ongkir: zUang.default(0),
	ppnPersen: z.coerce.number().min(0, 'PPN tidak boleh minus').max(100, 'PPN maksimal 100%').default(0),
	items: z
		.array(
			z.object({
				productId: z.string().trim().min(1, 'Pilih produk'),
				qty: z.coerce.number().int('Jumlah harus bilangan bulat').positive('Jumlah minimal 1').max(10000000),
				unitPrice: zUang
			})
		)
		.min(1, 'Tambahkan minimal satu barang')
});

/** @param {any} tx @param {Konteks} ctx @param {any} input */
async function siapkanPO(tx, ctx, input) {
	const d = dataValid(poSchema.safeParse(input));
	const idProduk = d.items.map((/** @type {any} */ i) => i.productId);
	if (new Set(idProduk).size !== idProduk.length) {
		throw new PengadaanError('Ada produk yang sama lebih dari sekali. Gabungkan jumlahnya dalam satu baris.');
	}

	const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, d.supplierId), eq(suppliers.unitId, ctx.unitId))).limit(1);
	if (!supplier) throw new PengadaanError('Supplier tidak ditemukan di unit ini', 404);
	if (!supplier.isActive) throw new PengadaanError(`Supplier ${supplier.namaSupplier} sudah nonaktif`);

	const ada = await tx
		.select({ id: products.id })
		.from(products)
		.where(and(eq(products.unitId, ctx.unitId), isNull(products.deletedAt), inArray(products.id, idProduk)));
	if (ada.length !== idProduk.length) throw new PengadaanError('Ada produk yang tidak ditemukan di unit ini', 404);

	const hitung = hitungTotalPO(d.items, d);
	if (hitung.diskon > hitung.subtotal) throw new PengadaanError('Diskon tidak boleh melebihi subtotal');

	return {
		header: {
			supplierId: d.supplierId,
			expectedDate: d.expectedDate ? new Date(`${d.expectedDate}T00:00:00+07:00`) : null,
			notes: d.notes,
			diskon: String(hitung.diskon),
			ongkir: String(hitung.ongkir),
			ppnPersen: String(d.ppnPersen),
			totalAmount: String(hitung.total)
		},
		items: d.items.map((/** @type {any} */ i) => ({
			productId: i.productId,
			qtyOrdered: i.qty,
			unitPrice: String(bulat(i.unitPrice)),
			totalPrice: String(bulat(i.qty * i.unitPrice))
		}))
	};
}

/** @param {any} db @param {Konteks} ctx @param {any} input @returns {Promise<number>} */
export async function buatPO(db, ctx, input) {
	return denganCobaUlangNomor(() =>
		db.transaction(async (/** @type {any} */ tx) => {
			const { header, items } = await siapkanPO(tx, ctx, input);
			const poNumber = await nomorDokumen(tx, purchaseOrders, purchaseOrders.poNumber, awalanNomor('PO', ctx.unitId, todayStrWIB()));
			const [hasil] = await tx.insert(purchaseOrders).values({ ...header, poNumber, unitId: ctx.unitId, createdBy: ctx.userId, status: 'DRAFT' });
			const poId = hasil.insertId;
			await tx.insert(purchaseOrderItems).values(items.map((/** @type {any} */ i) => ({ ...i, poId })));
			await catatRiwayat(tx, ctx, `PO ${poNumber} dibuat`);
			return poId;
		})
	);
}

/**
 * Ambil & kunci PO milik unit ini beserta barangnya.
 * @param {any} tx @param {Konteks} ctx @param {number} poId
 */
async function kunciPO(tx, ctx, poId) {
	const [po] = await tx
		.select()
		.from(purchaseOrders)
		.where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.unitId, ctx.unitId)))
		.for('update');
	if (!po) throw new PengadaanError('Purchase Order tidak ditemukan', 404);
	const items = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId)).for('update');
	return { po, items };
}

/** @param {any} db @param {Konteks} ctx @param {number} poId @param {any} input */
export async function ubahPO(db, ctx, poId, input) {
	await db.transaction(async (/** @type {any} */ tx) => {
		const { po } = await kunciPO(tx, ctx, poId);
		if (po.status !== 'DRAFT') throw new PengadaanError('Hanya PO berstatus Draft yang bisa diubah', 409);
		const { header, items } = await siapkanPO(tx, ctx, input);
		await tx.update(purchaseOrders).set(header).where(eq(purchaseOrders.id, poId));
		await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
		await tx.insert(purchaseOrderItems).values(items.map((/** @type {any} */ i) => ({ ...i, poId })));
	});
}

/** @param {any} db @param {Konteks} ctx @param {number} poId */
export async function kirimPO(db, ctx, poId) {
	await db.transaction(async (/** @type {any} */ tx) => {
		const { po } = await kunciPO(tx, ctx, poId);
		if (po.status !== 'DRAFT') throw new PengadaanError('PO ini sudah pernah dikirim', 409);
		await tx.update(purchaseOrders).set({ status: 'SENT' }).where(eq(purchaseOrders.id, poId));
		await catatRiwayat(tx, ctx, `PO ${po.poNumber} dikirim ke supplier`);
	});
}

/** @param {any} db @param {Konteks} ctx @param {number} poId @param {string} [alasan] */
export async function batalPO(db, ctx, poId, alasan) {
	await db.transaction(async (/** @type {any} */ tx) => {
		const { po, items } = await kunciPO(tx, ctx, poId);
		if (!['DRAFT', 'SENT'].includes(po.status)) throw new PengadaanError('PO ini tidak bisa dibatalkan lagi', 409);
		if (items.some((/** @type {any} */ i) => Number(i.qtyReceived || 0) > 0)) {
			throw new PengadaanError('Barang sudah ada yang diterima. Gunakan "Tutup PO" untuk mengakhiri sisanya.', 409);
		}
		await tx
			.update(purchaseOrders)
			.set({ status: 'CANCELLED', alasanBatal: String(alasan || '').trim().slice(0, 255) || null })
			.where(eq(purchaseOrders.id, poId));
		await catatRiwayat(tx, ctx, `PO ${po.poNumber} dibatalkan`);
	});
}

/** Akhiri PO yang diterima sebagian: sisa barang tidak lagi ditunggu. @param {any} db @param {Konteks} ctx @param {number} poId */
export async function tutupPO(db, ctx, poId) {
	await db.transaction(async (/** @type {any} */ tx) => {
		const { po } = await kunciPO(tx, ctx, poId);
		if (po.status !== 'PARTIAL') throw new PengadaanError('Hanya PO yang diterima sebagian yang bisa ditutup', 409);
		await tx.update(purchaseOrders).set({ status: 'COMPLETED' }).where(eq(purchaseOrders.id, poId));
		await catatRiwayat(tx, ctx, `PO ${po.poNumber} ditutup, sisa barang tidak ditunggu lagi`);
	});
}

/** @param {any} db @param {Konteks} ctx @param {number} poId */
export async function hapusPO(db, ctx, poId) {
	await db.transaction(async (/** @type {any} */ tx) => {
		const { po } = await kunciPO(tx, ctx, poId);
		if (po.status !== 'DRAFT') throw new PengadaanError('Hanya PO berstatus Draft yang bisa dihapus', 409);
		await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
		await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));
		await catatRiwayat(tx, ctx, `PO ${po.poNumber} (draft) dihapus`);
	});
}

// ─── Penerimaan barang ────────────────────────────────────────────────────

const barisQtySchema = z
	.array(z.object({ itemId: z.coerce.number().int().positive(), qty: z.coerce.number().int('Jumlah harus bilangan bulat').min(0, 'Jumlah tidak boleh minus') }))
	.transform((b) => b.filter((x) => x.qty > 0))
	.refine((b) => b.length > 0, 'Isi jumlah minimal satu barang')
	// Baris ganda bisa melewati pengecekan sisa: tiap baris dicek terhadap jumlah yang sama
	.refine((b) => new Set(b.map((x) => x.itemId)).size === b.length, 'Ada barang yang tercantum lebih dari sekali');

const terimaSchema = z.object({
	tanggal: zTanggal.optional(),
	noSuratJalan: zOpsional(100),
	catatan: zOpsional(2000),
	items: barisQtySchema
});

/** Nama produk untuk pesan error @param {any} tx @param {string[]} id */
async function namaProduk(tx, id) {
	if (id.length === 0) return new Map();
	const baris = await tx.select({ id: products.id, nama: products.nama }).from(products).where(inArray(products.id, id));
	return new Map(baris.map((/** @type {any} */ p) => [p.id, p.nama]));
}

/**
 * Stok masuk, harga pokok rata-rata, dokumen penerimaan, dan status PO.
 * Harus dipanggil di dalam transaksi setelah kunciPO.
 * @param {any} tx @param {Konteks} ctx @param {any} po @param {any[]} items
 * @param {{ tanggal: string, noSuratJalan?: string | null, catatan?: string | null, baris: { itemId: number, qty: number }[], statusAkhir?: string }} data
 */
async function terapkanPenerimaan(tx, ctx, po, items, data) {
	const peta = new Map(items.map((i) => [i.id, i]));
	const nama = await namaProduk(tx, items.map((i) => i.productId));
	const subtotalPO = items.reduce((s, i) => s + Number(i.qtyOrdered) * Number(i.unitPrice), 0);

	const nomor = await nomorDokumen(tx, purchaseReceipts, purchaseReceipts.nomor, awalanNomor('GRN', ctx.unitId, data.tanggal), eq(purchaseReceipts.unitId, ctx.unitId));
	const [hasil] = await tx.insert(purchaseReceipts).values({
		unitId: ctx.unitId,
		poId: po.id,
		nomor,
		tanggal: data.tanggal,
		noSuratJalan: data.noSuratJalan || null,
		catatan: data.catatan || null,
		createdBy: ctx.userId
	});
	const receiptId = hasil.insertId;

	for (const { itemId, qty } of data.baris) {
		const item = peta.get(itemId);
		if (!item) throw new PengadaanError('Ada barang yang bukan bagian dari PO ini');
		const label = nama.get(item.productId) || item.productId;
		if (qty > sisaDiterima(item)) {
			throw new PengadaanError(`Jumlah ${label} melebihi sisa pesanan (sisa ${sisaDiterima(item)})`, 409);
		}

		const [produk] = await tx
			.select({ stok: products.stok, hargaBeli: products.hargaBeli })
			.from(products)
			.where(and(eq(products.id, item.productId), eq(products.unitId, ctx.unitId)))
			.for('update');
		if (!produk) throw new PengadaanError(`Produk ${label} sudah tidak ada di unit ini`, 409);

		const stokAwal = Number(produk.stok || 0);
		const stokAkhir = stokAwal + qty;
		const nilaiBarang = qty * Number(item.unitPrice);
		const pokokPerUnit = hitungPorsi(nilaiBarang, subtotalPO, po).persediaan / qty;

		await tx
			.update(products)
			.set({ stok: stokAkhir, hargaBeli: String(hargaRataRata(stokAwal, Number(produk.hargaBeli || 0), qty, pokokPerUnit)) })
			.where(eq(products.id, item.productId));
		await tx.insert(stockLogs).values({
			id: randomUUID(),
			productId: item.productId,
			userId: String(ctx.userId),
			unitId: ctx.unitId,
			stokAwal,
			perubahan: qty,
			stokAkhir,
			alasan: 'MASUK',
			keterangan: `Penerimaan ${nomor} dari PO ${po.poNumber}`
		});
		await tx.update(purchaseOrderItems).set({ qtyReceived: Number(item.qtyReceived || 0) + qty }).where(eq(purchaseOrderItems.id, itemId));
		await tx.insert(purchaseReceiptItems).values({ receiptId, poItemId: itemId, productId: item.productId, qty });
		item.qtyReceived = Number(item.qtyReceived || 0) + qty;
	}

	const lengkap = items.every((i) => sisaDiterima(i) === 0);
	await tx
		.update(purchaseOrders)
		.set({ status: data.statusAkhir || (lengkap ? 'COMPLETED' : 'PARTIAL') })
		.where(eq(purchaseOrders.id, po.id));
	await catatRiwayat(tx, ctx, `Barang PO ${po.poNumber} diterima (${nomor})`, 'success');
	return receiptId;
}

/**
 * @param {any} db @param {Konteks} ctx @param {number} poId
 * @param {{ tanggal?: string, noSuratJalan?: string, catatan?: string, items: { itemId: number, qty: number }[] }} input
 * @returns {Promise<number>} id penerimaan
 */
export async function terimaBarang(db, ctx, poId, input) {
	const d = dataValid(terimaSchema.safeParse(input));
	const tanggal = d.tanggal || todayStrWIB();
	return denganCobaUlangNomor(() =>
		db.transaction(async (/** @type {any} */ tx) => {
			const { po, items } = await kunciPO(tx, ctx, poId);
			if (po.status === 'DRAFT') throw new PengadaanError('Kirim PO ke supplier dulu sebelum menerima barang', 409);
			if (!['SENT', 'PARTIAL'].includes(po.status)) throw new PengadaanError('PO ini sudah tidak menunggu barang', 409);
			return terapkanPenerimaan(tx, ctx, po, items, { tanggal, noSuratJalan: d.noSuratJalan, catatan: d.catatan, baris: d.items });
		})
	);
}

/**
 * Penerimaan lewat app mobile: semua sisa barang diterima sekaligus dan dianggap dibayar tunai,
 * jadi tidak bisa ditagih lagi di web. Perilaku app mobile tidak berubah (status RECEIVED + transaksi KELUAR).
 * @param {any} db @param {Konteks} ctx @param {number} poId
 */
export async function terimaSemuaDariMobile(db, ctx, poId) {
	return denganCobaUlangNomor(() =>
		db.transaction(async (/** @type {any} */ tx) => {
			const { po, items } = await kunciPO(tx, ctx, poId);
			if (['RECEIVED', 'COMPLETED', 'CANCELLED'].includes(po.status)) {
				throw new PengadaanError('PO ini sudah selesai atau dibatalkan', 409);
			}
			const baris = items.filter((/** @type {any} */ i) => sisaDiterima(i) > 0).map((/** @type {any} */ i) => ({ itemId: i.id, qty: sisaDiterima(i) }));
			if (baris.length === 0) throw new PengadaanError('Tidak ada barang yang menunggu diterima', 409);

			const subtotalPO = items.reduce((/** @type {number} */ s, /** @type {any} */ i) => s + Number(i.qtyOrdered) * Number(i.unitPrice), 0);
			const nilaiSisa = baris.reduce((s, b) => {
				const item = items.find((/** @type {any} */ i) => i.id === b.itemId);
				return s + b.qty * Number(item.unitPrice);
			}, 0);
			const nominal = hitungPorsi(nilaiSisa, subtotalPO, po).total;

			await terapkanPenerimaan(tx, ctx, po, items, { tanggal: todayStrWIB(), catatan: 'Diterima lewat app mobile', baris, statusAkhir: 'RECEIVED' });
			for (const b of baris) {
				const item = items.find((/** @type {any} */ i) => i.id === b.itemId);
				await tx.update(purchaseOrderItems).set({ qtyInvoiced: Number(item.qtyInvoiced || 0) + b.qty }).where(eq(purchaseOrderItems.id, b.itemId));
			}
			const [supplier] = await tx.select({ nama: suppliers.namaSupplier }).from(suppliers).where(eq(suppliers.id, po.supplierId)).limit(1);
			await tx.insert(transaksi).values({
				unitId: ctx.unitId,
				userId: ctx.userId,
				kategoriTrx: 'KELUAR',
				nominal: String(nominal),
				totalHarga: String(nominal),
				keterangan: `Pembelian PO ${po.poNumber} dari ${supplier?.nama || 'Supplier'}`
			});
			return { poNumber: po.poNumber, nominal };
		})
	);
}

// ─── Akun & jurnal ────────────────────────────────────────────────────────

/** Kode akun baru yang belum dipakai unit ini @param {any[]} akun @param {string} kode */
function kodeKosong(akun, kode) {
	const terpakai = new Set(akun.map((a) => a.kodeAkun));
	let hasil = kode;
	for (let i = 1; terpakai.has(hasil); i++) hasil = `${kode}-${i}`;
	return hasil;
}

/**
 * Akun Persediaan, Hutang Usaha, dan PPN Masukan milik unit; yang belum ada dibuat otomatis.
 * Hutang gaji, leasing, konsinyasi, dan uang muka tidak boleh terpilih sebagai hutang pembelian.
 * @param {any} tx @param {number} unitId @param {{ butuhPpn?: boolean }} [opsi]
 * @returns {Promise<{ persediaanId: number, hutangId: number, ppnId: number | null }>}
 */
export async function pastikanAkunPengadaan(tx, unitId, opsi = {}) {
	await pastikanCoaStandar(tx, unitId);
	/** @type {any[]} */
	const akun = await tx
		.select({ id: chartOfAccounts.id, kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)))
		.orderBy(chartOfAccounts.kodeAkun);

	const buat = async (/** @type {any} */ baru) => {
		const [hasil] = await tx.insert(chartOfAccounts).values({ ...baru, kodeAkun: kodeKosong(akun, baru.kodeAkun), unitId, isActive: 1 });
		return hasil.insertId;
	};

	const persediaan = akun.find((a) => a.tipeAkun === 'ASET_LANCAR' && /persediaan/i.test(a.namaAkun));
	const hutang = akun.find((a) => a.tipeAkun === 'LIABILITAS_LANCAR' && /hutang|utang/i.test(a.namaAkun) && !/gaji|leasing|konsinyasi|uang muka/i.test(a.namaAkun));
	const ppn = akun.find((a) => /ppn masukan|pajak masukan/i.test(a.namaAkun));

	return {
		persediaanId: persediaan?.id ?? (await buat({ kodeAkun: '1-10004', namaAkun: 'Persediaan Barang', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' })),
		hutangId: hutang?.id ?? (await buat({ kodeAkun: '2-10001', namaAkun: 'Hutang Usaha', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT' })),
		ppnId: ppn?.id ?? (opsi.butuhPpn ? await buat({ kodeAkun: '1-10005', namaAkun: 'PPN Masukan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' }) : null)
	};
}

/**
 * @param {any} tx @param {Konteks} ctx
 * @param {{ tanggal: string, nomor: string, referensi: string, memo: string, sourceType: string, sourceId: string | number, baris: { coaId: number, debit?: number, kredit?: number, contactId?: number | null }[] }} j
 * @returns {Promise<number>} id jurnal
 */
async function postingJurnal(tx, ctx, j) {
	const baris = j.baris.filter((b) => bulat(b.debit) > 0 || bulat(b.kredit) > 0);
	const debit = bulat(baris.reduce((s, b) => s + bulat(b.debit), 0));
	const kredit = bulat(baris.reduce((s, b) => s + bulat(b.kredit), 0));
	if (debit !== kredit) throw new Error(`Jurnal pengadaan tidak seimbang: ${debit} != ${kredit}`);

	const [hasil] = await tx.insert(journalEntries).values({
		unitId: ctx.unitId,
		userId: ctx.userId,
		tanggal: j.tanggal,
		nomorJurnal: j.nomor.slice(0, 50),
		referensi: j.referensi.slice(0, 100),
		memo: j.memo,
		sourceType: j.sourceType,
		sourceId: String(j.sourceId),
		totalDebit: String(debit),
		totalKredit: String(kredit),
		status: 'POSTED'
	});
	const journalId = hasil.insertId;
	await tx.insert(journalEntryLines).values(
		baris.map((b) => ({
			journalId,
			coaId: b.coaId,
			keterangan: j.memo.slice(0, 255),
			debit: String(bulat(b.debit)),
			kredit: String(bulat(b.kredit)),
			contactId: b.contactId ?? null
		}))
	);
	return journalId;
}

/**
 * Kontak akuntansi supplier (payables.contact_id wajib ke tabel accounting_contacts).
 * Pakai yang sudah terhubung → yang namanya sama → buat baru.
 * @param {any} tx @param {Konteks} ctx @param {any} supplier
 * @returns {Promise<number>}
 */
async function kontakAkuntansi(tx, ctx, supplier) {
	if (supplier.contactId) {
		const [ada] = await tx
			.select({ id: accountingContacts.id })
			.from(accountingContacts)
			.where(and(eq(accountingContacts.id, supplier.contactId), eq(accountingContacts.unitId, ctx.unitId)))
			.limit(1);
		if (ada) return ada.id;
	}
	const [samaNama] = await tx
		.select({ id: accountingContacts.id })
		.from(accountingContacts)
		.where(and(eq(accountingContacts.unitId, ctx.unitId), eq(accountingContacts.namaKontak, supplier.namaSupplier), inArray(accountingContacts.tipeKontak, ['SUPPLIER', 'BOTH'])))
		.limit(1);
	let contactId = samaNama?.id;
	if (!contactId) {
		const k = bacaKontak(supplier.kontak);
		const [baru] = await tx.insert(accountingContacts).values({
			unitId: ctx.unitId,
			namaKontak: supplier.namaSupplier,
			tipeKontak: 'SUPPLIER',
			email: k.email || null,
			telepon: k.phone || null,
			alamat: k.address || null,
			npwp: k.npwp || null,
			termPembayaran: supplier.termPembayaran ?? 30
		});
		contactId = baru.insertId;
	}
	await tx.update(suppliers).set({ contactId }).where(eq(suppliers.id, supplier.id));
	return contactId;
}

// ─── Tagihan & pembayaran ─────────────────────────────────────────────────

const tagihanSchema = z
	.object({
		nomorFaktur: z.string().trim().min(1, 'Nomor faktur supplier wajib diisi').max(50),
		tanggal: zTanggal,
		jatuhTempo: zTanggal,
		items: barisQtySchema
	})
	.refine((d) => d.jatuhTempo >= d.tanggal, 'Jatuh tempo tidak boleh sebelum tanggal faktur');

/**
 * Tagihan supplier untuk barang yang sudah diterima tapi belum ditagih.
 * @param {any} db @param {Konteks} ctx @param {number} poId @param {any} input
 * @returns {Promise<{ invoiceId: number, payableId: number, total: number }>}
 */
export async function buatTagihan(db, ctx, poId, input) {
	const d = dataValid(tagihanSchema.safeParse(input));
	try {
		return await db.transaction(async (/** @type {any} */ tx) => {
			const { po, items } = await kunciPO(tx, ctx, poId);
			const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, po.supplierId)).limit(1);
			if (!supplier) throw new PengadaanError('Supplier PO ini sudah tidak ada', 409);

			const peta = new Map(items.map((/** @type {any} */ i) => [i.id, i]));
			const nama = await namaProduk(tx, items.map((/** @type {any} */ i) => i.productId));
			let nilaiBarang = 0;
			for (const { itemId, qty } of d.items) {
				const item = /** @type {any} */ (peta.get(itemId));
				if (!item) throw new PengadaanError('Ada barang yang bukan bagian dari PO ini');
				if (qty > sisaDitagih(item)) {
					throw new PengadaanError(`Jumlah ${nama.get(item.productId) || item.productId} melebihi barang yang belum ditagih (sisa ${sisaDitagih(item)})`, 409);
				}
				nilaiBarang += qty * Number(item.unitPrice);
			}

			const subtotalPO = items.reduce((/** @type {number} */ s, /** @type {any} */ i) => s + Number(i.qtyOrdered) * Number(i.unitPrice), 0);
			const porsi = hitungPorsi(nilaiBarang, subtotalPO, po);
			if (!(porsi.total > 0)) throw new PengadaanError('Nilai tagihan harus lebih dari 0');

			const contactId = await kontakAkuntansi(tx, ctx, supplier);
			const akun = await pastikanAkunPengadaan(tx, ctx.unitId, { butuhPpn: porsi.ppn > 0 });

			const [hutang] = await tx.insert(payables).values({
				unitId: ctx.unitId,
				contactId,
				nomorFaktur: d.nomorFaktur,
				tanggal: d.tanggal,
				jatuhTempo: d.jatuhTempo,
				nominal: String(porsi.total),
				sudahDibayar: '0',
				status: 'BELUM_BAYAR',
				keterangan: `Tagihan PO ${po.poNumber}`
			});
			const payableId = hutang.insertId;

			const journalId = await postingJurnal(tx, ctx, {
				tanggal: d.tanggal,
				nomor: `JRN-PBL-${payableId}`,
				referensi: d.nomorFaktur,
				memo: `Pembelian PO ${po.poNumber} dari ${supplier.namaSupplier}, faktur ${d.nomorFaktur}`,
				sourceType: 'PURCHASE',
				sourceId: payableId,
				baris: [
					{ coaId: akun.persediaanId, debit: porsi.persediaan },
					...(porsi.ppn > 0 ? [{ coaId: /** @type {number} */ (akun.ppnId), debit: porsi.ppn }] : []),
					{ coaId: akun.hutangId, kredit: porsi.total, contactId }
				]
			});
			await tx.update(payables).set({ journalId }).where(eq(payables.id, payableId));

			const [faktur] = await tx.insert(purchaseInvoices).values({
				unitId: ctx.unitId,
				poId,
				supplierId: po.supplierId,
				payableId,
				journalId,
				nomorFaktur: d.nomorFaktur,
				tanggal: d.tanggal,
				jatuhTempo: d.jatuhTempo,
				subtotal: String(porsi.nilaiBarang),
				diskon: String(porsi.diskon),
				ongkir: String(porsi.ongkir),
				ppn: String(porsi.ppn),
				total: String(porsi.total),
				createdBy: ctx.userId
			});
			const invoiceId = faktur.insertId;

			for (const { itemId, qty } of d.items) {
				const item = /** @type {any} */ (peta.get(itemId));
				await tx.update(purchaseOrderItems).set({ qtyInvoiced: Number(item.qtyInvoiced || 0) + qty }).where(eq(purchaseOrderItems.id, itemId));
				await tx.insert(purchaseInvoiceItems).values({ invoiceId, poItemId: itemId, productId: item.productId, qty, unitPrice: item.unitPrice });
			}
			await catatRiwayat(tx, ctx, `Tagihan ${d.nomorFaktur} untuk PO ${po.poNumber} dicatat sebagai hutang`);
			return { invoiceId, payableId, total: porsi.total };
		});
	} catch (err) {
		const kode = /** @type {any} */ (err)?.code ?? /** @type {any} */ (err)?.cause?.code;
		if (kode === 'ER_DUP_ENTRY') throw new PengadaanError(`Faktur ${d.nomorFaktur} dari supplier ini sudah pernah dicatat`, 409);
		throw err;
	}
}

/**
 * Bayar hutang yang punya jurnal pembelian: Dr Hutang Usaha, Kr Kas/Bank + baris arus kas.
 * @param {any} db @param {Konteks} ctx @param {number} payableId @param {{ nominal: unknown, kasCoaId: unknown }} input
 */
export async function bayarTagihan(db, ctx, payableId, input) {
	const nominal = bulat(input.nominal);
	const kasCoaId = Number(input.kasCoaId);
	if (!(nominal > 0)) throw new PengadaanError('Nominal bayar harus lebih dari 0');
	if (!kasCoaId) throw new PengadaanError('Pilih akun kas/bank untuk pembayaran');

	return db.transaction(async (/** @type {any} */ tx) => {
		const [hutang] = await tx
			.select()
			.from(payables)
			.where(and(eq(payables.id, payableId), eq(payables.unitId, ctx.unitId)))
			.for('update');
		if (!hutang) throw new PengadaanError('Tagihan tidak ditemukan', 404);
		const sisa = bulat(Number(hutang.nominal) - Number(hutang.sudahDibayar || 0));
		if (sisa <= 0) throw new PengadaanError('Tagihan ini sudah lunas', 409);
		if (nominal > sisa) throw new PengadaanError(`Nominal melebihi sisa tagihan (sisa Rp ${sisa.toLocaleString('id-ID')})`, 409);

		const [kas] = await tx
			.select({ id: chartOfAccounts.id })
			.from(chartOfAccounts)
			.where(and(eq(chartOfAccounts.id, kasCoaId), eq(chartOfAccounts.unitId, ctx.unitId), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR')))
			.limit(1);
		if (!kas) throw new PengadaanError('Akun kas/bank tidak ditemukan di unit ini', 404);

		const akun = await pastikanAkunPengadaan(tx, ctx.unitId);
		const { trxId, journalId } = await catatTransaksi(tx, {
			unitId: ctx.unitId,
			userId: ctx.userId,
			kategori: 'KELUAR',
			nominal,
			keterangan: `Pembayaran hutang faktur ${hutang.nomorFaktur}`,
			coaId: akun.hutangId,
			kasCoaId
		});

		const dibayar = bulat(Number(hutang.sudahDibayar || 0) + nominal);
		await tx.update(payables).set({ sudahDibayar: String(dibayar), status: statusHutang(Number(hutang.nominal), dibayar) }).where(eq(payables.id, payableId));
		await tx.insert(purchasePayments).values({ unitId: ctx.unitId, payableId, journalId, trxId, kasCoaId, nominal: String(nominal), createdBy: ctx.userId });
		return { sisa: bulat(sisa - nominal) };
	});
}

// ─── Retur ────────────────────────────────────────────────────────────────

const returSchema = z.object({
	tanggal: zTanggal.optional(),
	alasan: z.string().trim().min(1, 'Alasan retur wajib diisi').max(255),
	items: barisQtySchema
});

/**
 * Retur barang ke supplier. Barang yang belum ditagih cukup mengurangi stok;
 * barang yang sudah ditagih juga memotong hutang PO ini (tagihan terlama dulu).
 * Kalau hutangnya sudah terbayar, pengembalian uang tidak ditangani di sini: retur ditolak.
 * @param {any} db @param {Konteks} ctx @param {number} poId @param {any} input
 * @returns {Promise<{ returnId: number, nilaiPotongHutang: number }>}
 */
export async function returBarang(db, ctx, poId, input) {
	const d = dataValid(returSchema.safeParse(input));
	const tanggal = d.tanggal || todayStrWIB();
	return denganCobaUlangNomor(() =>
		db.transaction(async (/** @type {any} */ tx) => {
			const { po, items } = await kunciPO(tx, ctx, poId);
			const peta = new Map(items.map((/** @type {any} */ i) => [i.id, i]));
			const nama = await namaProduk(tx, items.map((/** @type {any} */ i) => i.productId));
			const subtotalPO = items.reduce((/** @type {number} */ s, /** @type {any} */ i) => s + Number(i.qtyOrdered) * Number(i.unitPrice), 0);

			const nomor = await nomorDokumen(tx, purchaseReturns, purchaseReturns.nomor, awalanNomor('RET', ctx.unitId, tanggal), eq(purchaseReturns.unitId, ctx.unitId));
			const [hasil] = await tx.insert(purchaseReturns).values({ unitId: ctx.unitId, poId, nomor, tanggal, alasan: d.alasan, createdBy: ctx.userId });
			const returnId = hasil.insertId;

			let nilaiSudahDitagih = 0;
			for (const { itemId, qty } of d.items) {
				const item = /** @type {any} */ (peta.get(itemId));
				if (!item) throw new PengadaanError('Ada barang yang bukan bagian dari PO ini');
				const label = nama.get(item.productId) || item.productId;
				if (qty > sisaDiretur(item)) throw new PengadaanError(`Jumlah retur ${label} melebihi barang yang diterima (maks ${sisaDiretur(item)})`, 409);

				const belumDitagih = Math.min(qty, sisaDitagih(item));
				const sudahDitagih = qty - belumDitagih;
				nilaiSudahDitagih += sudahDitagih * Number(item.unitPrice);

				// Stok tidak boleh minus: barangnya mungkin sudah terjual
				const [produk] = await tx
					.select({ stok: products.stok })
					.from(products)
					.where(and(eq(products.id, item.productId), eq(products.unitId, ctx.unitId)))
					.for('update');
				const stokAwal = Number(produk?.stok || 0);
				const [ubah] = await tx
					.update(products)
					.set({ stok: sql`${products.stok} - ${qty}` })
					.where(and(eq(products.id, item.productId), eq(products.unitId, ctx.unitId), gte(products.stok, qty)));
				if (!ubah?.affectedRows) throw new PengadaanError(`Stok ${label} tidak cukup untuk diretur (sisa ${stokAwal})`, 409);

				await tx.insert(stockLogs).values({
					id: randomUUID(),
					productId: item.productId,
					userId: String(ctx.userId),
					unitId: ctx.unitId,
					stokAwal,
					perubahan: -qty,
					stokAkhir: stokAwal - qty,
					alasan: 'RETUR',
					keterangan: `Retur ${nomor} dari PO ${po.poNumber}: ${d.alasan}`
				});
				await tx
					.update(purchaseOrderItems)
					.set({ qtyReturned: Number(item.qtyReturned || 0) + qty, qtyInvoiced: Number(item.qtyInvoiced || 0) - sudahDitagih })
					.where(eq(purchaseOrderItems.id, itemId));
				await tx.insert(purchaseReturnItems).values({ returnId, poItemId: itemId, productId: item.productId, qty });
			}

			let nilaiPotongHutang = 0;
			if (nilaiSudahDitagih > 0) {
				const porsi = hitungPorsi(nilaiSudahDitagih, subtotalPO, po);
				nilaiPotongHutang = porsi.total;

				const tagihan = await tx
					.select({ id: payables.id, nominal: payables.nominal, sudahDibayar: payables.sudahDibayar, contactId: payables.contactId })
					.from(purchaseInvoices)
					.innerJoin(payables, eq(purchaseInvoices.payableId, payables.id))
					.where(eq(purchaseInvoices.poId, poId))
					.orderBy(asc(payables.jatuhTempo), asc(payables.id))
					.for('update');
				const totalSisa = tagihan.reduce((/** @type {number} */ s, /** @type {any} */ t) => s + Number(t.nominal) - Number(t.sudahDibayar || 0), 0);
				if (bulat(totalSisa) < porsi.total) {
					throw new PengadaanError(
						`Barang ini sudah ditagih dan sisa hutangnya (Rp ${bulat(totalSisa).toLocaleString('id-ID')}) lebih kecil dari nilai retur (Rp ${porsi.total.toLocaleString('id-ID')}). Pengembalian uang dari supplier dicatat lewat Jurnal Umum.`,
						409
					);
				}

				let sisaPotong = porsi.total;
				for (const t of tagihan) {
					if (sisaPotong <= 0) break;
					const sisaTagihan = bulat(Number(t.nominal) - Number(t.sudahDibayar || 0));
					const potong = Math.min(sisaPotong, sisaTagihan);
					if (potong <= 0) continue;
					const nominalBaru = bulat(Number(t.nominal) - potong);
					await tx.update(payables).set({ nominal: String(nominalBaru), status: statusHutang(nominalBaru, Number(t.sudahDibayar || 0)) }).where(eq(payables.id, t.id));
					sisaPotong = bulat(sisaPotong - potong);
				}

				const akun = await pastikanAkunPengadaan(tx, ctx.unitId, { butuhPpn: porsi.ppn > 0 });
				const journalId = await postingJurnal(tx, ctx, {
					tanggal,
					nomor: `JRN-RET-${returnId}`,
					referensi: nomor,
					memo: `Retur pembelian ${nomor} dari PO ${po.poNumber}`,
					sourceType: 'PURCHASE_RETURN',
					sourceId: returnId,
					baris: [
						{ coaId: akun.hutangId, debit: porsi.total },
						{ coaId: akun.persediaanId, kredit: porsi.persediaan },
						...(porsi.ppn > 0 ? [{ coaId: /** @type {number} */ (akun.ppnId), kredit: porsi.ppn }] : [])
					]
				});
				await tx.update(purchaseReturns).set({ journalId, nilaiPotongHutang: String(porsi.total) }).where(eq(purchaseReturns.id, returnId));
			}

			await catatRiwayat(tx, ctx, `Retur ${nomor} untuk PO ${po.poNumber} dicatat`);
			return { returnId, nilaiPotongHutang };
		})
	);
}

// ─── Bacaan untuk halaman ─────────────────────────────────────────────────

/**
 * Unit milik user berdasarkan slug.
 * @param {any} db @param {string} slug @param {number} userId
 */
export async function unitDariSlug(db, slug, userId) {
	const [unit] = await db
		.select()
		.from(unitBisnis)
		.where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId)))
		.limit(1);
	return unit ?? null;
}

/**
 * Detail lengkap satu PO dan dokumen turunannya.
 * @param {any} db @param {number} unitId @param {number} poId
 */
export async function detailPO(db, unitId, poId) {
	const [po] = await db
		.select()
		.from(purchaseOrders)
		.where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.unitId, unitId)))
		.limit(1);
	if (!po) return null;

	const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId)).limit(1);
	const items = await db
		.select({
			id: purchaseOrderItems.id,
			productId: purchaseOrderItems.productId,
			qtyOrdered: purchaseOrderItems.qtyOrdered,
			qtyReceived: purchaseOrderItems.qtyReceived,
			qtyInvoiced: purchaseOrderItems.qtyInvoiced,
			qtyReturned: purchaseOrderItems.qtyReturned,
			unitPrice: purchaseOrderItems.unitPrice,
			totalPrice: purchaseOrderItems.totalPrice,
			namaProduk: products.nama,
			sku: products.sku,
			stok: products.stok
		})
		.from(purchaseOrderItems)
		.leftJoin(products, eq(purchaseOrderItems.productId, products.id))
		.where(eq(purchaseOrderItems.poId, poId))
		.orderBy(asc(purchaseOrderItems.id));

	const penerimaan = await db.select().from(purchaseReceipts).where(eq(purchaseReceipts.poId, poId)).orderBy(desc(purchaseReceipts.id));
	const tagihan = await db
		.select({
			id: purchaseInvoices.id,
			nomorFaktur: purchaseInvoices.nomorFaktur,
			tanggal: purchaseInvoices.tanggal,
			jatuhTempo: purchaseInvoices.jatuhTempo,
			total: purchaseInvoices.total,
			payableId: purchaseInvoices.payableId,
			nominalHutang: payables.nominal,
			sudahDibayar: payables.sudahDibayar,
			statusHutang: payables.status
		})
		.from(purchaseInvoices)
		.innerJoin(payables, eq(purchaseInvoices.payableId, payables.id))
		.where(eq(purchaseInvoices.poId, poId))
		.orderBy(desc(purchaseInvoices.id));
	const retur = await db.select().from(purchaseReturns).where(eq(purchaseReturns.poId, poId)).orderBy(desc(purchaseReturns.id));

	const barisPenerimaan = penerimaan.length
		? await db.select().from(purchaseReceiptItems).where(inArray(purchaseReceiptItems.receiptId, penerimaan.map((/** @type {any} */ p) => p.id)))
		: [];
	const barisRetur = retur.length
		? await db.select().from(purchaseReturnItems).where(inArray(purchaseReturnItems.returnId, retur.map((/** @type {any} */ r) => r.id)))
		: [];
	const namaPer = new Map(items.map((/** @type {any} */ i) => [i.id, i.namaProduk || i.productId]));
	const ringkas = (/** @type {any[]} */ baris, /** @type {string} */ kunci, /** @type {number} */ id) =>
		baris.filter((b) => b[kunci] === id).map((b) => `${namaPer.get(b.poItemId) || b.productId} × ${b.qty}`).join(', ');

	return {
		po,
		supplier: supplier ? { ...supplier, detail: bacaKontak(supplier.kontak) } : null,
		items,
		penerimaan: penerimaan.map((/** @type {any} */ p) => ({ ...p, ringkasan: ringkas(barisPenerimaan, 'receiptId', p.id) })),
		tagihan,
		retur: retur.map((/** @type {any} */ r) => ({ ...r, ringkasan: ringkas(barisRetur, 'returnId', r.id) }))
	};
}

/** Akun kas/bank untuk pilihan pembayaran @param {any} db @param {number} unitId */
export async function daftarAkunKas(db, unitId) {
	const akun = await db
		.select({ id: chartOfAccounts.id, kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR'), eq(chartOfAccounts.isActive, 1)))
		.orderBy(chartOfAccounts.kodeAkun);
	return akun.filter((/** @type {any} */ a) => /kas|bank/i.test(a.namaAkun));
}
