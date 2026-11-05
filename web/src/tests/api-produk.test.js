/**
 * Tes API produk untuk app mobile (#8): riwayat stok, edit massal + rollback, terapkan harga.
 * Hanya jalan kalau TEST_DATABASE_URL diset (database khusus tes).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
// Redis tiruan di memori (rollback disimpan di sini)
const fakeRedis = vi.hoisted(() => {
	const m = new Map();
	return {
		store: m,
		set: async (/** @type {string} */ k, /** @type {any} */ v) => { m.set(k, v); return 'OK'; },
		get: async (/** @type {string} */ k) => m.get(k) ?? null,
		del: async (/** @type {string[]} */ ...ks) => { ks.forEach((k) => m.delete(k)); return ks.length; },
		keys: async () => []
	};
});
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: fakeRedis }));

describe.skipIf(!TEST_DB)('API produk mobile', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};
	const cookies = { get: () => undefined };

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		r.moves = await import('../routes/api/app/products/stock-movements/+server.js');
		r.bulk = await import('../routes/api/app/products/bulk/+server.js');
		r.rollback = await import('../routes/api/app/products/bulk/rollback/+server.js');
		r.pricing = await import('../routes/api/app/products/pricing/+server.js');

		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `pa${t}`, email: `pa${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `pb${t}`, email: `pb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko', slug: `toko-p-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Lain', slug: `lain-p-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId;
		const [k] = await db.insert(s.kategoriProduk).values({ unitId: id.unit, namaKategori: 'Minuman' });
		id.kat = k.insertId;
		const [k2] = await db.insert(s.kategoriProduk).values({ unitId: id.unitLain, namaKategori: 'Punya orang' });
		id.katLain = k2.insertId;
		id.p1 = `P1-${t}`; id.p2 = `P2-${t}`; id.pLain = `PL-${t}`;
		await db.insert(s.products).values([
			{ id: id.p1, slug: `p1-${t}`, nama: 'Kopi', userId: id.user, unitId: id.unit, hargaBeli: '10000', hargaJual: '15000', stok: 10 },
			{ id: id.p2, slug: `p2-${t}`, nama: 'Teh', userId: id.user, unitId: id.unit, hargaBeli: '4000', hargaJual: '6000', stok: 5 },
			{ id: id.pLain, slug: `pl-${t}`, nama: 'Milik orang', userId: id.userLain, unitId: id.unitLain, hargaBeli: '1', hargaJual: '2', stok: 1 }
		]);
		await db.insert(s.stockLogs).values([
			{ id: `L1-${t}`, productId: id.p1, userId: String(id.user), unitId: id.unit, stokAwal: 12, perubahan: -2, stokAkhir: 10, alasan: 'PENJUALAN', keterangan: 'POS' },
			{ id: `L2-${t}`, productId: id.p1, userId: String(id.user), unitId: id.unit, stokAwal: 2, perubahan: 10, stokAkhir: 12, alasan: 'MASUK' }
		]);
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	const produk = async (/** @type {string} */ pid) => db.query.products.findFirst({ where: eq(s.products.id, pid) });
	/** @param {any} body */
	const bulk = (body) => r.bulk.POST({
		url: new URL(`http://x?unitId=${id.unit}`), cookies,
		request: new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
	});
	/** @param {string} operationId */
	const rollback = (operationId) => r.rollback.POST({
		url: new URL(`http://x?unitId=${id.unit}`), cookies,
		request: new Request('http://x', { method: 'POST', body: JSON.stringify({ operationId }), headers: { 'content-type': 'application/json' } })
	});

	it('riwayat stok: urut terbaru, tipe dipetakan ke StockMovement', async () => {
		login.userId = id.user;
		const res = await r.moves.GET({ url: new URL(`http://x?unitId=${id.unit}&productId=${id.p1}`), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data).toHaveLength(2);
		const jual = body.data.find((/** @type {any} */ m) => m.reason === 'PENJUALAN');
		expect(jual).toMatchObject({ type: 'SALE', quantity: -2, stockBefore: 12, stockAfter: 10, notes: 'POS' });
		expect(body.data.find((/** @type {any} */ m) => m.reason === 'MASUK').type).toBe('PURCHASE');
	});

	it('riwayat stok produk unit lain → 404', async () => {
		login.userId = id.user;
		const res = await r.moves.GET({ url: new URL(`http://x?unitId=${id.unit}&productId=${id.pLain}`), cookies, request: new Request('http://x') });
		expect(res.status).toBe(404);
	});

	it('edit massal harga per item + rollback mengembalikan harga lama', async () => {
		login.userId = id.user;
		const res = await bulk({ type: 'PRICE_UPDATE', items: [{ productId: id.p1, newPrice: 20000 }, { productId: id.p2, newPrice: 7000 }] });
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data).toMatchObject({ totalItems: 2, successCount: 2, failureCount: 0 });
		expect(Number((await produk(id.p1)).hargaJual)).toBe(20000);
		expect(body.data.operationId).toMatch(/^BULK-/);

		const rb = await rollback(body.data.operationId);
		expect(rb.status).toBe(200);
		expect(Number((await produk(id.p1)).hargaJual)).toBe(15000);
		expect(Number((await produk(id.p2)).hargaJual)).toBe(6000);
		// operationId sekali pakai
		expect((await rollback(body.data.operationId)).status).toBe(404);
	});

	it('harga massal pakai markup % dari harga beli (rumus kalkulator web)', async () => {
		login.userId = id.user;
		const res = await bulk({ type: 'PRICE_UPDATE', productIds: [id.p1, id.p2], payload: { markup: '50' } });
		expect(res.status).toBe(200);
		expect(Number((await produk(id.p1)).hargaJual)).toBe(15000);
		expect(Number((await produk(id.p2)).hargaJual)).toBe(6000);
	});

	it('update harga tanpa harga baru → 422 (bukan diam-diam tidak berubah)', async () => {
		login.userId = id.user;
		expect((await bulk({ type: 'PRICE_UPDATE', productIds: [id.p1] })).status).toBe(422);
	});

	it('hapus massal = pindah ke Sampah seperti web, lalu restore', async () => {
		login.userId = id.user;
		const res = await bulk({ type: 'DELETE', productIds: [id.p2] });
		expect(res.status).toBe(200);
		const p = await produk(id.p2);
		expect(p.deletedAt).toBeTruthy();
		expect(p.status).toBe('archived');
		expect((await bulk({ type: 'RESTORE', productIds: [id.p2] })).status).toBe(200);
		const p2 = await produk(id.p2);
		expect(p2.deletedAt).toBeNull();
		expect(p2.status).toBe('active');
	});

	it('ganti kategori: kategori unit lain ditolak, kategori sendiri diterima', async () => {
		login.userId = id.user;
		expect((await bulk({ type: 'CATEGORY_CHANGE', productIds: [id.p1], payload: { kategoriId: String(id.katLain) } })).status).toBe(404);
		expect((await bulk({ type: 'CATEGORY_CHANGE', productIds: [id.p1], payload: { kategoriId: String(id.kat) } })).status).toBe(200);
		expect((await produk(id.p1)).kategoriId).toBe(id.kat);
	});

	it('produk unit lain di daftar: dilewati & dilaporkan, data orang lain tidak berubah', async () => {
		login.userId = id.user;
		const res = await bulk({ type: 'ARCHIVE', productIds: [id.p1, id.pLain] });
		const body = await res.json();
		expect(body.data).toMatchObject({ totalItems: 2, successCount: 1, failureCount: 1 });
		expect(body.data.itemResults.find((/** @type {any} */ x) => x.productId === id.pLain).success).toBe(false);
		expect((await produk(id.pLain)).status).toBe('active');
		expect((await produk(id.p1)).status).toBe('archived');
	});

	it('jenis operasi tidak dikenal → 422', async () => {
		login.userId = id.user;
		expect((await bulk({ type: 'HAPUS_SEMUA', productIds: [id.p1] })).status).toBe(422);
	});

	it('terapkan harga: markup, margin, fixed; produk unit lain 404', async () => {
		login.userId = id.user;
		/** @param {any} body */
		const terapkan = (body) => r.pricing.POST({
			url: new URL(`http://x?unitId=${id.unit}`), cookies,
			request: new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
		});
		expect((await terapkan({ productId: id.p1, type: 'PERCENTAGE', value: 25 })).status).toBe(200);
		expect(Number((await produk(id.p1)).hargaJual)).toBe(12500);
		expect((await terapkan({ productId: id.p1, type: 'MARGIN', value: 20 })).status).toBe(200);
		expect(Number((await produk(id.p1)).hargaJual)).toBe(12500);
		expect((await terapkan({ productId: id.p1, type: 'FIXED', value: 18000 })).status).toBe(200);
		expect(Number((await produk(id.p1)).hargaJual)).toBe(18000);
		expect((await terapkan({ productId: id.p1, type: 'TIERED', value: 1 })).status).toBe(422);
		expect((await terapkan({ productId: id.pLain, type: 'FIXED', value: 1 })).status).toBe(404);
	});
});
