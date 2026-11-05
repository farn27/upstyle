/**
 * Tes dashboard keuangan & hapus transaksi.
 *
 * Semua tes memanggil KODE ASLI aplikasi (bukan objek tiruan):
 * - Bagian 1: logika hitung di src/lib/financeDashboard.js (dipakai server & halaman)
 * - Bagian 2: hapusTransaksi() terhadap database MySQL sungguhan.
 *   Hanya jalan kalau TEST_DATABASE_URL diset ke database KOSONG khusus tes
 *   yang tabelnya sudah dibuat:  npx drizzle-kit push  (DATABASE_URL = db tes)
 *
 * Jalankan:  npx vitest run src/tests/finance-dashboard-bugfix.test.js
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	PRESETS,
	rentangPreset,
	presetDariRentang,
	hitungSaldoKas,
	proyeksiArusKasBulanIni,
	targetBulananOtomatis,
	deltaStokSaatHapus,
	labelMetodeBayar
} from '../lib/financeDashboard.js';

// Rabu, 4 Nov 2026 jam 10.00 WIB (= 03.00 UTC). Bulan November = 30 hari.
const NOW = new Date(Date.UTC(2026, 10, 4, 3, 0, 0));

describe('Saldo kas', () => {
	it('memasukkan modal awal', () => {
		expect(hitungSaldoKas({ modalAwal: '10000000.00', totalMasuk: '5000000', totalKeluar: 3000000 })).toBe(12_000_000);
	});
	it('tetap angka walau data kosong', () => {
		expect(hitungSaldoKas({ modalAwal: null, totalMasuk: undefined, totalKeluar: 0 })).toBe(0);
	});
});

describe('Preset periode', () => {
	it('punya pilihan "Semua"', () => {
		expect(PRESETS[0]).toBe('Semua');
		expect(rentangPreset('Semua', NOW)).toBeNull();
	});
	it('menghitung rentang tiap preset', () => {
		expect(rentangPreset('Hari Ini', NOW)).toEqual({ start: '2026-11-04', end: '2026-11-04' });
		expect(rentangPreset('Kemarin', NOW)).toEqual({ start: '2026-11-03', end: '2026-11-03' });
		expect(rentangPreset('7 Hari', NOW)).toEqual({ start: '2026-10-29', end: '2026-11-04' });
		expect(rentangPreset('Bulan Ini', NOW)).toEqual({ start: '2026-11-01', end: '2026-11-04' });
	});
	it('mengenali preset dari tanggal di URL (setelah refresh)', () => {
		for (const preset of PRESETS) {
			const r = rentangPreset(preset, NOW);
			expect(presetDariRentang(r?.start ?? 'all', r?.end ?? 'all', NOW)).toBe(preset);
		}
		expect(presetDariRentang('2026-01-01', '2026-01-15', NOW)).toBe('Kustom');
		expect(presetDariRentang(undefined, undefined, NOW)).toBe('Semua');
	});
	it('tetap pakai tanggal WIB walau dijalankan di server UTC (jam 00.00–07.00 WIB)', () => {
		const jam01WIB = new Date(Date.UTC(2026, 10, 3, 18, 0, 0)); // 4 Nov 01.00 WIB = 3 Nov 18.00 UTC
		expect(rentangPreset('Hari Ini', jam01WIB)).toEqual({ start: '2026-11-04', end: '2026-11-04' });
		expect(presetDariRentang('2026-11-04', '2026-11-04', jam01WIB)).toBe('Hari Ini');
	});
	it('pergantian bulan & tahun mengikuti WIB', () => {
		const awalDesember = new Date(Date.UTC(2026, 10, 30, 17, 30, 0)); // 1 Des 00.30 WIB
		expect(rentangPreset('Bulan Ini', awalDesember)).toEqual({ start: '2026-12-01', end: '2026-12-01' });
		const tahunBaru = new Date(Date.UTC(2026, 11, 31, 17, 0, 0)); // 1 Jan 2027 00.00 WIB
		expect(rentangPreset('Kemarin', tahunBaru)).toEqual({ start: '2026-12-31', end: '2026-12-31' });
		expect(rentangPreset('7 Hari', tahunBaru)).toEqual({ start: '2026-12-26', end: '2027-01-01' });
	});
	it('7 Hari mencakup tepat 7 hari termasuk hari ini', () => {
		const { start, end } = /** @type {{ start: string, end: string }} */ (rentangPreset('7 Hari', NOW));
		const hari = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000 + 1;
		expect(hari).toBe(7);
	});
});

describe('Proyeksi arus kas bulan ini', () => {
	it('memakai laju harian × jumlah hari di bulan itu', () => {
		// 4 hari berjalan: net 4 jt → 1 jt/hari × 30 hari (November)
		expect(proyeksiArusKasBulanIni({ totalMasuk: 6_000_000, totalKeluar: 2_000_000, now: NOW })).toBe(30_000_000);
	});
	it('menghitung bulan 31 hari dengan benar', () => {
		const tgl10Okt = new Date(Date.UTC(2026, 9, 10, 3, 0, 0)); // 10 Okt WIB, Oktober = 31 hari
		expect(proyeksiArusKasBulanIni({ totalMasuk: 1_000_000, totalKeluar: 0, now: tgl10Okt })).toBe(3_100_000);
	});
	it('bisa negatif saat defisit', () => {
		expect(proyeksiArusKasBulanIni({ totalMasuk: 0, totalKeluar: 4_000_000, now: NOW })).toBe(-30_000_000);
	});
});

describe('Target bulanan otomatis', () => {
	it('modal × 1,5 dengan minimal Rp10 jt', () => {
		expect(targetBulananOtomatis('20000000.00')).toBe(30_000_000);
		expect(targetBulananOtomatis(1_000_000)).toBe(10_000_000);
		expect(targetBulananOtomatis(null)).toBe(10_000_000);
	});
});

describe('Stok saat transaksi dihapus', () => {
	it('penjualan (MASUK) mengembalikan stok', () => {
		expect(deltaStokSaatHapus({ productId: 'P1', kategoriTrx: 'MASUK', qty: 3 })).toBe(3);
	});
	it('pengeluaran (KELUAR) tidak mengubah stok', () => {
		expect(deltaStokSaatHapus({ productId: 'P1', kategoriTrx: 'KELUAR', qty: 3 })).toBe(0);
	});
	it('transaksi tanpa produk tidak mengubah stok', () => {
		expect(deltaStokSaatHapus({ productId: null, kategoriTrx: 'MASUK', qty: 3 })).toBe(0);
	});
});

describe('Label metode bayar', () => {
	it('ID akun kas (dari form entry) → nama akun', () => {
		expect(labelMetodeBayar('12', { 12: 'Kas Besar' })).toBe('Kas Besar');
		expect(labelMetodeBayar('99', {})).toBe('Kas');
	});
	it('nama metode (dari POS) tampil apa adanya', () => {
		expect(labelMetodeBayar('QRIS')).toBe('QRIS');
		expect(labelMetodeBayar(null)).toBe('KAS');
	});
});

// ─── Integrasi: hapusTransaksi() terhadap MySQL sungguhan ───────────────────
const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)('hapusTransaksi() — database sungguhan', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let pool;
	/** @type {any} */ let schema;
	/** @type {any} */ let hapusTransaksi;
	/** @type {any} */ let eq;
	/** @type {any} */ let and;
	/** @type {Record<string, any>} */
	const ids = {};

	beforeAll(async () => {
		schema = await import('../lib/server/schema.js');
		({ hapusTransaksi } = await import('../lib/server/hapusTransaksi.js'));
		({ eq, and } = await import('drizzle-orm'));
		const mysql = (await import('mysql2/promise')).default;
		const { drizzle } = await import('drizzle-orm/mysql2');
		pool = mysql.createPool(/** @type {string} */ (TEST_DB));
		db = drizzle(pool, { schema, mode: 'default' });

		const s = Date.now();
		const [u] = await db.insert(schema.users).values({ username: `tes${s}`, email: `tes${s}@contoh.id` });
		ids.user = u.insertId;
		const [unit] = await db.insert(schema.unitBisnis).values({ userId: ids.user, namaUnit: 'Unit Tes', slug: `unit-tes-${s}`, modalAwal: '1000000' });
		ids.unit = unit.insertId;
		ids.produk = `PRD-${s}`;
		await db.insert(schema.products).values({ id: ids.produk, slug: `produk-${s}`, nama: 'Produk Tes', userId: ids.user, unitId: ids.unit, hargaBeli: '5000', hargaJual: '8000', stok: 7 });
		const [kas] = await db.insert(schema.chartOfAccounts).values({ unitId: ids.unit, kodeAkun: '1-1001', namaAkun: 'Kas', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' });
		ids.kas = kas.insertId;
	});

	afterAll(async () => {
		// unit dulu (cascade ke transaksi, produk, jurnal, akun), baru user
		if (ids.unit) await db.delete(schema.unitBisnis).where(eq(schema.unitBisnis.id, ids.unit));
		if (ids.user) await db.delete(schema.users).where(eq(schema.users.id, ids.user));
		await pool?.end();
	});

	/** Bikin transaksi persis seperti form entry: jurnal TRX + baris jurnal + transaksi */
	/** @param {'MASUK' | 'KELUAR'} kategoriTrx @param {number} qty */
	async function buatTransaksiEntry(kategoriTrx, qty) {
		const [j] = await db.insert(schema.journalEntries).values({
			unitId: ids.unit, userId: ids.user, tanggal: '2026-11-04', nomorJurnal: `JRN-TES-${Date.now()}-${qty}`,
			sourceType: 'TRX', totalDebit: '24000', totalKredit: '24000', status: 'POSTED'
		});
		await db.insert(schema.journalEntryLines).values([
			{ journalId: j.insertId, coaId: ids.kas, debit: '24000', kredit: '0' },
			{ journalId: j.insertId, coaId: ids.kas, debit: '0', kredit: '24000' }
		]);
		const [t] = await db.insert(schema.transaksi).values({
			unitId: ids.unit, userId: ids.user, kategoriTrx, nominal: '24000', totalHarga: '24000',
			productId: ids.produk, qty, metodeBayar: String(ids.kas)
		});
		await db.update(schema.journalEntries).set({ sourceId: String(t.insertId) }).where(eq(schema.journalEntries.id, j.insertId));
		return { trxId: t.insertId, journalId: j.insertId };
	}

	const stokProduk = async () => (await db.query.products.findFirst({ where: eq(schema.products.id, ids.produk) })).stok;
	const jurnalAda = async (/** @type {number} */ journalId) => Boolean(await db.query.journalEntries.findFirst({ where: eq(schema.journalEntries.id, journalId) }));
	const barisJurnal = async (/** @type {number} */ journalId) => (await db.select().from(schema.journalEntryLines).where(eq(schema.journalEntryLines.journalId, journalId))).length;

	it('hapus penjualan: stok kembali, jurnal & barisnya ikut terhapus', async () => {
		const { trxId, journalId } = await buatTransaksiEntry('MASUK', 3);
		const sebelum = await stokProduk();

		const hasil = await db.transaction((/** @type {any} */ tx) => hapusTransaksi(tx, { unitId: ids.unit, trxId }));

		expect(hasil.stokDikembalikan).toBe(3);
		expect(hasil.jurnalTerhapus).toBe(1);
		expect(await stokProduk()).toBe(sebelum + 3);
		expect(await jurnalAda(journalId)).toBe(false);
		expect(await barisJurnal(journalId)).toBe(0);
		expect(await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, trxId) })).toBeUndefined();
	});

	it('hapus pengeluaran: stok TIDAK berubah, jurnal terhapus', async () => {
		const { trxId, journalId } = await buatTransaksiEntry('KELUAR', 2);
		const sebelum = await stokProduk();

		await db.transaction((/** @type {any} */ tx) => hapusTransaksi(tx, { unitId: ids.unit, trxId }));

		expect(await stokProduk()).toBe(sebelum);
		expect(await jurnalAda(journalId)).toBe(false);
	});

	it('tidak bisa menghapus transaksi milik unit lain', async () => {
		const { trxId, journalId } = await buatTransaksiEntry('MASUK', 1);

		const hasil = await db.transaction((/** @type {any} */ tx) => hapusTransaksi(tx, { unitId: ids.unit + 999999, trxId }));

		expect(hasil).toBeNull();
		expect(await jurnalAda(journalId)).toBe(true);
		expect(await db.query.transaksi.findFirst({ where: and(eq(schema.transaksi.id, trxId), eq(schema.transaksi.unitId, ids.unit)) })).toBeTruthy();
	});
});
