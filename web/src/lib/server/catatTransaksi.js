/**
 * Catat transaksi keuangan — SATU logika untuk web (form entry) dan mobile (api/app/finance).
 * Di dalam db.transaction yang sama:
 *   1. validasi akun COA & kas/bank milik unit
 *   2. penjualan (MASUK) dengan produk → stok dikurangi (produk harus milik unit)
 *   3. jurnal double-entry (sourceType 'TRX') + baris debit/kredit
 *   4. baris transaksi (dashboard cashflow) + riwayat aksi
 */
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import {
	transaksi,
	products,
	chartOfAccounts,
	journalEntries,
	journalEntryLines,
	riwayatAksi
} from '$lib/server/schema';
import { normalizeKategoriTrx } from '$lib/server/kategoriTrx';
import { nowWIB, todayStrWIB } from '$lib/server/dateUtils';

/** Error yang aman ditampilkan ke pengguna (status HTTP ikut dibawa) */
export class TransaksiError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 400) {
		super(message);
		this.name = 'TransaksiError';
		this.status = status;
	}
}

/** COA standar untuk unit yang belum punya akun sama sekali */
export const COA_STANDAR = [
	// KAS & BANK (ASET LANCAR)
	{ kodeAkun: '1-10001', namaAkun: 'Kas Tunai', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' },
	{ kodeAkun: '1-10002', namaAkun: 'Bank / Transfer', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' },
	{ kodeAkun: '1-10003', namaAkun: 'Piutang Usaha', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' },
	{ kodeAkun: '1-10004', namaAkun: 'Persediaan Barang', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' },
	// ASET TETAP
	{ kodeAkun: '1-20001', namaAkun: 'Peralatan & Mesin', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT' },
	// LIABILITAS
	{ kodeAkun: '2-10001', namaAkun: 'Hutang Usaha', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT' },
	{ kodeAkun: '2-10002', namaAkun: 'Hutang Gaji', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT' },
	// EKUITAS
	{ kodeAkun: '3-10001', namaAkun: 'Modal Pemilik', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT' },
	{ kodeAkun: '3-10002', namaAkun: 'Laba Ditahan', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT' },
	// PENDAPATAN
	{ kodeAkun: '4-10001', namaAkun: 'Pendapatan Penjualan', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT' },
	{ kodeAkun: '4-10002', namaAkun: 'Pendapatan Jasa', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT' },
	{ kodeAkun: '4-10003', namaAkun: 'Pendapatan Lain-Lain', tipeAkun: 'PENDAPATAN_LAINNYA', normalBalance: 'KREDIT' },
	// HPP
	{ kodeAkun: '5-10001', namaAkun: 'Harga Pokok Penjualan (HPP)', tipeAkun: 'HPP', normalBalance: 'DEBIT' },
	// BEBAN OPERASIONAL
	{ kodeAkun: '6-10001', namaAkun: 'Biaya Gaji & Tunjangan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
	{ kodeAkun: '6-10002', namaAkun: 'Biaya Sewa', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
	{ kodeAkun: '6-10003', namaAkun: 'Biaya Listrik & Air', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
	{ kodeAkun: '6-10004', namaAkun: 'Biaya Bahan Baku', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
	{ kodeAkun: '6-10005', namaAkun: 'Biaya Pemasaran & Iklan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
	{ kodeAkun: '6-10006', namaAkun: 'Biaya Operasional Lainnya', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' },
	// BEBAN LAINNYA
	{ kodeAkun: '7-10001', namaAkun: 'Beban Bunga & Administrasi Bank', tipeAkun: 'BEBAN_LAINNYA', normalBalance: 'DEBIT' }
];

/**
 * Isi COA standar kalau unit belum punya akun sama sekali.
 * @param {any} tx
 * @param {number} unitId
 * @returns {Promise<number>} jumlah akun yang ditambahkan (0 = sudah ada)
 */
export async function pastikanCoaStandar(tx, unitId) {
	const [{ jumlah }] = await tx
		.select({ jumlah: sql`COUNT(*)` })
		.from(chartOfAccounts)
		.where(eq(chartOfAccounts.unitId, unitId));
	if (Number(jumlah) > 0) return 0;
	await tx.insert(chartOfAccounts).values(COA_STANDAR.map((c) => ({ ...c, unitId, isActive: 1 })));
	return COA_STANDAR.length;
}

/**
 * Pilih akun default untuk klien yang tidak mengirim akun COA (mis. app mobile versi lama).
 * @param {any} tx
 * @param {number} unitId
 * @param {'MASUK' | 'KELUAR'} kategori
 * @param {string | null | undefined} [metodeBayar] mis. "KAS", "BANK", "TRANSFER", "QRIS"
 * @returns {Promise<{ coaId: number | null, kasCoaId: number | null }>}
 */
export async function pilihAkunDefault(tx, unitId, kategori, metodeBayar) {
	/** @type {{ id: number, namaAkun: string, tipeAkun: string, kodeAkun: string }[]} */
	const akun = await tx
		.select({ id: chartOfAccounts.id, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun, kodeAkun: chartOfAccounts.kodeAkun })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)))
		.orderBy(chartOfAccounts.kodeAkun);

	/** @param {string} tipe @param {RegExp} [suka] */
	const cari = (tipe, suka) => {
		const sesuaiTipe = akun.filter((a) => a.tipeAkun === tipe);
		return (suka && sesuaiTipe.find((a) => suka.test(a.namaAkun))) || sesuaiTipe[0] || null;
	};

	const nonTunai = /bank|transfer|tf|qris|debit|kartu|e-?wallet|ovo|gopay|dana/i.test(String(metodeBayar || ''));
	const kas = nonTunai
		? cari('ASET_LANCAR', /bank|transfer/i) || cari('ASET_LANCAR', /kas/i)
		: cari('ASET_LANCAR', /kas/i);
	const lawan = kategori === 'MASUK'
		? cari('PENDAPATAN', /penjualan/i)
		: cari('BEBAN_OPERASIONAL', /operasional lain/i);

	return { coaId: lawan?.id ?? null, kasCoaId: kas?.id ?? null };
}

/**
 * @param {any} tx  transaksi Drizzle
 * @param {{
 *   unitId: number, userId: number, kategori: string, nominal: number, keterangan: string,
 *   coaId: number | null, kasCoaId: number | null, productId?: string | null, qty?: number, abcCategoryId?: number | null
 * }} input
 * @returns {Promise<{ trxId: number, journalId: number, hppTotal: number, kategori: 'MASUK' | 'KELUAR' }>}
 */
export async function catatTransaksi(tx, input) {
	const { unitId, userId, coaId, kasCoaId } = input;
	/** @type {'MASUK' | 'KELUAR'} */
	let kategori;
	try {
		kategori = normalizeKategoriTrx(input.kategori);
	} catch {
		throw new TransaksiError('Kategori transaksi harus MASUK atau KELUAR', 422);
	}
	const nominal = Number(input.nominal);
	const qty = Math.max(1, Math.trunc(Number(input.qty) || 1));
	const keterangan = String(input.keterangan || '').trim();
	const productId = input.productId ? String(input.productId) : null;

	if (!(nominal > 0)) throw new TransaksiError('Nominal harus lebih dari 0!', 422);
	if (!keterangan) throw new TransaksiError('Keterangan wajib diisi', 422);
	if (!coaId) throw new TransaksiError('Pilih akun COA terlebih dahulu!', 422);
	if (!kasCoaId) throw new TransaksiError('Pilih metode bayar (akun kas/bank)!', 422);

	// 1. Akun COA & kas harus milik unit ini
	/** @type {{ id: number }[]} */
	const akunValid = await tx
		.select({ id: chartOfAccounts.id })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), inArray(chartOfAccounts.id, [Number(coaId), Number(kasCoaId)])));
	const idValid = new Set(akunValid.map((a) => a.id));
	if (!idValid.has(Number(coaId)) || !idValid.has(Number(kasCoaId))) {
		throw new TransaksiError('Akun COA tidak ditemukan di unit ini', 422);
	}

	// 2. Penjualan produk → kurangi stok (atomik: gagal kalau stok kurang)
	let hppTotal = 0;
	if (productId && kategori === 'MASUK') {
		const produk = await tx.query.products.findFirst({
			where: and(eq(products.id, productId), eq(products.unitId, unitId))
		});
		if (!produk) throw new TransaksiError('Produk tidak ditemukan di unit ini', 404);

		const [hasil] = await tx
			.update(products)
			.set({ stok: sql`${products.stok} - ${qty}` })
			.where(and(eq(products.id, productId), eq(products.unitId, unitId), gte(products.stok, qty)));
		if (!hasil?.affectedRows) {
			throw new TransaksiError(`Stok ${produk.nama} tidak mencukupi! (Sisa: ${produk.stok})`, 409);
		}
		hppTotal = Number(produk.hargaBeli || 0) * qty;
	}

	// 3. Jurnal double-entry
	const tanggalJurnal = todayStrWIB(); // dulu tanggal UTC: transaksi 00:00–06:59 WIB masuk hari sebelumnya
	const [jurnal] = await tx.insert(journalEntries).values({
		unitId,
		userId,
		tanggal: tanggalJurnal,
		nomorJurnal: `JRN-TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		referensi: keterangan.substring(0, 100),
		memo: keterangan,
		sourceType: 'TRX',
		totalDebit: String(nominal),
		totalKredit: String(nominal),
		status: 'POSTED'
	});
	const journalId = jurnal.insertId;

	// 4. Baris transaksi (dashboard cashflow) — metodeBayar = ID akun kas, sama seperti web
	const [trx] = await tx.insert(transaksi).values({
		userId,
		unitId,
		tanggal: nowWIB(),
		keterangan,
		nominal: String(nominal),
		totalHarga: String(nominal),
		hppTotal: String(hppTotal),
		kategoriTrx: kategori,
		metodeBayar: String(kasCoaId),
		productId,
		qty,
		abcCategoryId: input.abcCategoryId ?? null
	});
	const trxId = trx.insertId;
	await tx.update(journalEntries).set({ sourceId: String(trxId) }).where(eq(journalEntries.id, journalId));

	// MASUK: Debit Kas/Bank, Kredit Pendapatan — KELUAR: Debit Beban, Kredit Kas/Bank
	const [debitCoa, kreditCoa] = kategori === 'MASUK' ? [kasCoaId, coaId] : [coaId, kasCoaId];
	await tx.insert(journalEntryLines).values([
		{ journalId, coaId: debitCoa, keterangan, debit: String(nominal), kredit: '0' },
		{ journalId, coaId: kreditCoa, keterangan, debit: '0', kredit: String(nominal) }
	]);

	await tx.insert(riwayatAksi).values({
		userId,
		unitId,
		pesan: `MENCATAT ${kategori}: ${keterangan}`,
		tipe: kategori === 'MASUK' ? 'success' : 'info',
		waktu: nowWIB()
	});

	return { trxId, journalId, hppTotal, kategori };
}
