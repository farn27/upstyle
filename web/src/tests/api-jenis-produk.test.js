/**
 * Jenis barang: bahan baku / kemasan / perlengkapan tidak boleh dijual.
 * Hanya jalan kalau TEST_DATABASE_URL diset (database khusus tes).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('jenis barang di penjualan', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	const akhiran = Date.now();

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));

		const [u] = await db.insert(s.users).values({ username: `jenis${akhiran}`, email: `jenis${akhiran}@tes.local`, password: 'x' });
		id.user = u.insertId;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Kafe Tes', slug: `jenis-${akhiran}`, kategori: 'CAFE' });
		id.unit = unit.insertId;

		const produk = (/** @type {string} */ kode, /** @type {string} */ jenis) => ({
			id: `${kode}${akhiran}`, slug: `${kode}${akhiran}`, nama: kode, userId: id.user, unitId: id.unit,
			hargaBeli: '1000', hargaJual: '5000', stok: 10, jenis
		});
		await db.insert(s.products).values([produk('jual', 'BARANG_JADI'), produk('bahan', 'BAHAN_BAKU'), produk('cup', 'KEMASAN')]);
		await db.insert(s.products).values({ id: `lama${akhiran}`, slug: `lama${akhiran}`, nama: 'lama', userId: id.user, unitId: id.unit, hargaBeli: '1', hargaJual: '2' });
	});

	afterAll(async () => {
		if (id.user) await db.delete(s.users).where(eq(s.users.id, id.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool.end();
	});

	it('produk lama tanpa jenis otomatis menjadi barang jadi', async () => {
		const [p] = await db.select().from(s.products).where(eq(s.products.id, `lama${akhiran}`));
		expect(p.jenis).toBe('BARANG_JADI');
	});

	it('pengaturan kasir hanya menampilkan barang jadi', async () => {
		const { daftarProdukPos } = await import('../lib/server/posKelola.js');
		const nama = (await daftarProdukPos(db, id.unit)).map((/** @type {any} */ p) => p.nama).sort();
		expect(nama).toEqual(['jual', 'lama']);
	});

	it('checkout toko online menolak bahan baku dan menerima barang jadi', async () => {
		const { actions } = await import('../routes/store/[domainSlug]/checkout/+page.server.js');
		// Unit toko kini dibaca dari domainSlug (bukan unitId kiriman formulir)
		await db.insert(s.ecommerceSettings).values({ unitId: id.unit, storefrontName: 'Kafe Tes', domainSlug: `toko-${akhiran}`, isActive: true });
		const pesan = (/** @type {string} */ productId) => {
			const f = new FormData();
			for (const [k, v] of Object.entries({ customerName: 'Budi', customerEmail: 'b@tes.local', customerPhone: '08', shippingAddress: 'Jl', totalAmount: '5000', unitId: String(id.unit) })) f.set(k, v);
			f.set('cartData', JSON.stringify([{ productId, qty: 1, price: 5000 }]));
			return actions.placeOrder(/** @type {any} */ ({ request: new Request('http://x/', { method: 'POST', body: f }), params: { domainSlug: `toko-${akhiran}` } }));
		};

		expect(await pesan(`bahan${akhiran}`)).toMatchObject({ success: false });
		expect(await pesan(`cup${akhiran}`)).toMatchObject({ success: false });
		expect(await pesan('tidak-ada')).toMatchObject({ success: false });

		// Barang jadi lolos validasi; action selesai dengan redirect ke halaman sukses
		await expect(pesan(`jual${akhiran}`)).rejects.toMatchObject({ status: 303 });
		const pesanan = await db.select().from(s.ecommerceOrders).where(eq(s.ecommerceOrders.unitId, id.unit));
		expect(pesanan).toHaveLength(1);
		// Total dihitung server dari harga produk, bukan totalAmount/price kiriman peramban
		expect(Number(pesanan[0].totalAmount)).toBe(5000);
		const f = new FormData();
		for (const [k, v] of Object.entries({ customerName: 'Curang', customerPhone: '08', shippingAddress: 'Jl', totalAmount: '1' })) f.set(k, v);
		f.set('cartData', JSON.stringify([{ productId: `jual${akhiran}`, qty: 2, price: 1 }]));
		await expect(actions.placeOrder(/** @type {any} */ ({ request: new Request('http://x/', { method: 'POST', body: f }), params: { domainSlug: `toko-${akhiran}` } }))).rejects.toMatchObject({ status: 303 });
		const semua = await db.select().from(s.ecommerceOrders).where(eq(s.ecommerceOrders.unitId, id.unit));
		expect(semua.map((/** @type {any} */ o) => Number(o.totalAmount)).sort((a, b) => a - b)).toEqual([5000, 10000]);
		// qty negatif ditolak
		const g = new FormData();
		for (const [k, v] of Object.entries({ customerName: 'X', customerPhone: '08', shippingAddress: 'Jl' })) g.set(k, v);
		g.set('cartData', JSON.stringify([{ productId: `jual${akhiran}`, qty: -3 }]));
		expect(await actions.placeOrder(/** @type {any} */ ({ request: new Request('http://x/', { method: 'POST', body: g }), params: { domainSlug: `toko-${akhiran}` } }))).toMatchObject({ success: false });
	});

	it('pengadaan tetap bisa membeli bahan baku', async () => {
		const p = await import('../lib/server/pengadaan.js');
		const ctx = { unitId: id.unit, userId: id.user };
		const supplierId = await p.buatSupplier(db, ctx, { namaSupplier: 'Roastery' });
		const poId = await p.buatPO(db, ctx, { supplierId, items: [{ productId: `bahan${akhiran}`, qty: 2, unitPrice: 1000 }] });
		expect(poId).toBeGreaterThan(0);
	});
});
