/**
 * Checkout kasir bersama (lib/server/posCheckout.js) — dipakai kasir web dan app mobile.
 * Regresi temuan uji 8 Nov 2026:
 *  F-12 potongan voucher tidak ikut ke transaksi (dasbor ≠ jurnal) · F-6 bayar kurang lolos di server
 *  F-9 penjualan tidak masuk riwayat stok · F-8 CASH vs TUNAI · F-5 pelanggan baru tidak tertaut
 *  F-1 produk terhapus bisa dijual · akun kas jurnal tidak mengikuti metode bayar
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const siaran = vi.hoisted(() => ({ event: /** @type {string[]} */ ([]) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));
vi.mock('$lib/server/pusher', () => ({
	triggerEvent: async (/** @type {string} */ _r, /** @type {string} */ e) => { await new Promise((r) => setTimeout(r, 5)); siaran.event.push(e); return true; },
	pusherServer: { trigger: async () => {} }
}));

describe('bantu murni', () => {
	it('normalisasiMetodeBayar: tunai selalu TUNAI', async () => {
		const { normalisasiMetodeBayar } = await import('../lib/server/posCheckout.js');
		for (const m of ['CASH', 'cash', 'tunai', 'KAS', '', null, undefined]) expect(normalisasiMetodeBayar(m)).toBe('TUNAI');
		expect(normalisasiMetodeBayar('qris')).toBe('QRIS');
	});
	it('bagiNilaiBersih: jumlah baris = total', async () => {
		const { bagiNilaiBersih } = await import('../lib/server/posCheckout.js');
		expect(bagiNilaiBersih([15000], 13500)).toEqual([13500]);
		const b = bagiNilaiBersih([15000, 16000, 7000], 34199);
		expect(b.reduce((a, x) => a + x, 0)).toBe(34199);
		expect(bagiNilaiBersih([0, 0], 0)).toEqual([0, 0]);
	});
});

describe.skipIf(!TEST_DB)('prosesCheckoutPos', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let lib; /** @type {any} */ let o;
	/** @type {Record<string, any>} */ const id = {};
	/** @type {any} */ let unit;

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		lib = await import('../lib/server/posCheckout.js');
		({ db } = await import('../lib/server/drizzle.js'));
		o = await import('drizzle-orm');
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `pos${t}`, email: `pos${t}@x.id` });
		id.user = u.insertId;
		const [a] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Kasir Uji', slug: `kasir-${t}`, modalAwal: '0' });
		id.unit = a.insertId;
		const [b] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Unit Lain', slug: `lain-${t}`, modalAwal: '0' });
		id.unitLain = b.insertId;
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, id.unit));
		const p = (/** @type {string} */ k, /** @type {any} */ x) => ({ id: `${k}-${t}`, slug: `${k}-${t}`.toLowerCase(), userId: id.user, unitId: id.unit, hargaBeli: '1000', ...x });
		id.ori = `ORI-${t}`; id.lemon = `LMN-${t}`; id.hapus = `HPS-${t}`; id.asing = `ASG-${t}`;
		await db.insert(s.products).values([
			p('ORI', { nama: 'Es Teh Original', hargaJual: '5000', stok: 20 }),
			p('LMN', { nama: 'Es Teh Lemon', hargaJual: '7000', stok: 3 }),
			p('HPS', { nama: 'Matcha', hargaJual: '10000', stok: 50, deletedAt: '2026-11-01 00:00:00' }),
			{ ...p('ASG', { nama: 'Produk Unit Lain', hargaJual: '9000', stok: 9 }), unitId: id.unitLain }
		]);
		const [v] = await db.insert(s.vouchers).values({ unitId: id.unit, code: `UJI${t}`, discountType: 'PERCENTAGE', discountValue: '10', minPurchase: '1000', maxUsage: 1, currentUsage: 0, validFrom: '2020-01-01', validUntil: '2099-12-31', isActive: true });
		id.voucher = v.insertId; id.kode = `UJI${t}`;
		// produk bervarian: induk stok 8 = varian L (5) + XL (3)
		id.kaos = `KAOS-${t}`; id.varL = `VL-${t}`; id.varXL = `VXL-${t}`;
		await db.insert(s.products).values(p('KAOS', { nama: 'Kaos', hargaJual: '50000', stok: 8, hasVariant: 1 }));
		await db.insert(s.productVariants).values([
			{ id: id.varL, productId: id.kaos, namaVariasi: 'L', hargaBeli: '20000', hargaJual: '55000', stok: 5 },
			{ id: id.varXL, productId: id.kaos, namaVariasi: 'XL', hargaBeli: '20000', hargaJual: '60000', stok: 3 }
		]);
		unit = { id: id.unit, slug: `kasir-${t}`, userId: id.user, kategori: 'UMUM', posFeatureOverride: null };
	});

	const ctx = () => ({ unit, kasirPemilik: true, namaKasir: null });
	const trxOrder = async (/** @type {string} */ no) => db.select().from(s.transaksi).where(o.and(o.eq(s.transaksi.unitId, id.unit), o.like(s.transaksi.keterangan, '%POS%'))).then((/** @type {any[]} */ r) => r);

	it('penjualan tunai: kembalian, stok, riwayat stok, jurnal ke akun kas, metode TUNAI, pelanggan tertaut', async () => {
		const h = await lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 2 }], customerName: 'Xara', paymentMethod: 'CASH', amountPaid: 20000 });
		expect(h).toMatchObject({ subtotal: 10000, discount: 0, total: 10000, paid: 20000, change: 10000, paymentMethod: 'TUNAI' });
		const [order] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.id, h.orderId));
		expect(order.paymentMethod).toBe('TUNAI');
		expect(Number(order.change)).toBe(10000);
		expect(order.customerId).toBeTruthy(); // dulu null untuk pelanggan baru
		const [produk] = await db.select().from(s.products).where(o.eq(s.products.id, id.ori));
		expect(produk.stok).toBe(18);
		const log = await db.select().from(s.stockLogs).where(o.eq(s.stockLogs.productId, id.ori));
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({ alasan: 'PENJUALAN', stokAwal: 20, perubahan: -2, stokAkhir: 18 });
		const [jurnal] = await db.select().from(s.journalEntries).where(o.and(o.eq(s.journalEntries.unitId, id.unit), o.eq(s.journalEntries.sourceId, String(h.orderId))));
		const garis = await db.select({ debit: s.journalEntryLines.debit, nama: s.chartOfAccounts.namaAkun }).from(s.journalEntryLines).innerJoin(s.chartOfAccounts, o.eq(s.chartOfAccounts.id, s.journalEntryLines.coaId)).where(o.eq(s.journalEntryLines.journalId, jurnal.id));
		expect(garis.find((/** @type {any} */ g) => Number(g.debit) > 0)?.nama).toBe('Kas Tunai');
	});

	it('QRIS dijurnal ke akun bank, bukan kas tunai', async () => {
		const h = await lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 1 }], payments: [{ method: 'qris', amount: 5000 }] });
		expect(h.paymentMethod).toBe('QRIS');
		const [jurnal] = await db.select().from(s.journalEntries).where(o.and(o.eq(s.journalEntries.unitId, id.unit), o.eq(s.journalEntries.sourceId, String(h.orderId))));
		const garis = await db.select({ debit: s.journalEntryLines.debit, nama: s.chartOfAccounts.namaAkun }).from(s.journalEntryLines).innerJoin(s.chartOfAccounts, o.eq(s.chartOfAccounts.id, s.journalEntryLines.coaId)).where(o.eq(s.journalEntryLines.journalId, jurnal.id));
		expect(garis.find((/** @type {any} */ g) => Number(g.debit) > 0)?.nama).toBe('Bank / Transfer');
	});

	it('voucher: transaksi mencatat nilai SETELAH potongan dan sama dengan jurnal; kuota voucher terpakai', async () => {
		const h = await lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 3 }], voucherId: id.voucher, amountPaid: 13500 });
		expect(h).toMatchObject({ subtotal: 15000, discount: 1500, total: 13500 });
		const baris = await db.select().from(s.transaksi).where(o.and(o.eq(s.transaksi.unitId, id.unit), o.like(s.transaksi.keterangan, '%(3x)%')));
		expect(baris).toHaveLength(1);
		expect(Number(baris[0].nominal)).toBe(13500); // dulu 15000
		const [jurnal] = await db.select().from(s.journalEntries).where(o.and(o.eq(s.journalEntries.unitId, id.unit), o.eq(s.journalEntries.sourceId, String(h.orderId))));
		expect(Number(jurnal.totalDebit)).toBe(13500);
		const [v] = await db.select().from(s.vouchers).where(o.eq(s.vouchers.id, id.voucher));
		expect(v.currentUsage).toBe(1);
		// kuota habis → ditolak, bukan diam-diam tanpa potongan
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 1 }], voucherCode: id.kode })).rejects.toMatchObject({ status: 409 });
	});

	it('varian: harga varian dipakai, stok varian & induk berkurang, stok varian kurang ditolak', async () => {
		const h = await lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.kaos, variantId: id.varXL, qty: 2 }], amountPaid: 120000 });
		expect(h.total).toBe(120000);
		const [xl] = await db.select().from(s.productVariants).where(o.eq(s.productVariants.id, id.varXL));
		expect(xl.stok).toBe(1); // dulu tetap 3
		const [induk] = await db.select().from(s.products).where(o.eq(s.products.id, id.kaos));
		expect(induk.stok).toBe(6);
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.kaos, variantId: id.varXL, qty: 2 }], amountPaid: 120000 })).rejects.toMatchObject({ status: 409 });
		const [l] = await db.select().from(s.productVariants).where(o.eq(s.productVariants.id, id.varL));
		expect(l.stok).toBe(5); // gagal = tidak ada yang berubah
	});

	it('bayar kurang ditolak server dan tidak ada yang tersimpan', async () => {
		const sebelum = (await db.select().from(s.posOrders).where(o.eq(s.posOrders.unitId, id.unit))).length;
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.lemon, qty: 2 }], payments: [{ method: 'TUNAI', amount: 10000 }] })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('kurang') });
		expect((await db.select().from(s.posOrders).where(o.eq(s.posOrders.unitId, id.unit))).length).toBe(sebelum);
		const [produk] = await db.select().from(s.products).where(o.eq(s.products.id, id.lemon));
		expect(produk.stok).toBe(3);
	});

	it('stok kurang → 409 dengan sisa stok; mode offline (mobile) mencatat dan stok berhenti di 0', async () => {
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.lemon, qty: 5 }] })).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Sisa: 3') });
		const h = await lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.lemon, qty: 5 }], izinkanStokKurang: true });
		expect(h.total).toBe(35000);
		const [produk] = await db.select().from(s.products).where(o.eq(s.products.id, id.lemon));
		expect(produk.stok).toBe(0);
	});

	it('produk terhapus, produk unit lain, qty tidak valid, keranjang kosong ditolak', async () => {
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.hapus, qty: 1 }] })).rejects.toMatchObject({ status: 404 });
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.asing, qty: 1 }] })).rejects.toMatchObject({ status: 404 });
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 0 }] })).rejects.toBeInstanceOf(lib.PosError);
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 1.5 }] })).rejects.toBeInstanceOf(lib.PosError);
		await expect(lib.prosesCheckoutPos(db, ctx(), { items: [] })).rejects.toBeInstanceOf(lib.PosError);
	});

	it('harga kiriman klien diabaikan (harga dari database)', async () => {
		const h = await lib.prosesCheckoutPos(db, ctx(), { items: [{ productId: id.ori, qty: 1, harga: 1 }] });
		expect(h.total).toBe(5000);
	});

	it('siarkanCheckoutPos menunggu semua event terkirim', async () => {
		siaran.event.length = 0;
		await lib.siarkanCheckoutPos(unit, { orderNumber: 'POS-X', total: 5000 });
		expect(siaran.event.sort()).toEqual(['notification', 'pos-transaction', 'stats-updated', 'stock-updated']);
	});
});
