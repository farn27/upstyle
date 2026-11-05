/**
 * Tes pengaturan POS (#10): fitur POS per unit & produk tampil di kasir — API mobile dan halaman web.
 * Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/portalAuth', () => ({ getVerifiedStaffSession: async () => null }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('Pengaturan POS', () => {
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
		r.fitur = await import('../routes/api/app/pos/features/+server.js');
		r.produk = await import('../routes/api/app/pos/products/+server.js');
		r.webProduk = await import('../routes/(app)/finance/[slug]/pos/kelola/produk/+page.server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `qa${t}`, email: `qa${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `qb${t}`, email: `qb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Cafe', slug: `qa-${t}`, modalAwal: '0', kategori: 'CAFE' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Lain', slug: `qb-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId; id.slug = `qa-${t}`; id.slugLain = `qb-${t}`;
		id.p = `Q1-${t}`; id.pLain = `Q2-${t}`;
		await db.insert(s.products).values([
			{ id: id.p, slug: `q1-${t}`, nama: 'Latte', userId: id.user, unitId: id.unit, hargaBeli: '1', hargaJual: '2', stok: 1 },
			{ id: id.pLain, slug: `q2-${t}`, nama: 'Punya orang', userId: id.userLain, unitId: id.unitLain, hargaBeli: '1', hargaJual: '2', stok: 1 }
		]);
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** @param {string} m @param {any} [body] */
	const req = (m, body) => new Request('http://x', body === undefined ? { method: m } : { method: m, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

	it('fitur: default kategori, ubah satu fitur, lalu reset', async () => {
		login.userId = id.user;
		const awal = await (await r.fitur.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('GET') })).json();
		expect(awal.data.category).toBe('CAFE');
		expect(awal.data.keys).toContain('barcodeScanner');
		const asal = awal.data.activeFeatures.barcodeScanner;

		const ubah = await (await r.fitur.PUT({ cookies, request: req('PUT', { unitId: id.unit, features: { barcodeScanner: !asal, fiturNgawur: true } }) })).json();
		expect(ubah.data.activeFeatures.barcodeScanner).toBe(!asal);
		expect(ubah.data.overrides.fiturNgawur).toBeUndefined();
		// fitur lain tidak ikut berubah
		expect(ubah.data.activeFeatures.posEnabled).toBe(awal.data.activeFeatures.posEnabled);

		const reset = await (await r.fitur.DELETE({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('DELETE') })).json();
		expect(reset.data.activeFeatures.barcodeScanner).toBe(asal);
	});

	it('produk POS: daftar, sembunyikan, tampilkan; produk unit lain 404', async () => {
		login.userId = id.user;
		const daftar = await (await r.produk.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('GET') })).json();
		expect(daftar.data).toEqual([expect.objectContaining({ id: id.p, nama: 'Latte', showInPos: true })]);
		expect((await r.produk.PUT({ cookies, request: req('PUT', { unitId: id.unit, productId: id.p, showInPos: false }) })).status).toBe(200);
		expect((await db.query.products.findFirst({ where: eq(s.products.id, id.p) })).showInPos).toBe(0);
		expect((await r.produk.PUT({ cookies, request: req('PUT', { unitId: id.unit, productId: id.p, showInPos: true }) })).status).toBe(200);
		expect((await r.produk.PUT({ cookies, request: req('PUT', { unitId: id.unit, productId: id.pLain, showInPos: false }) })).status).toBe(404);
		expect((await db.query.products.findFirst({ where: eq(s.products.id, id.pLain) })).showInPos).toBe(1);
	});

	it('web pos/kelola/produk: tidak bisa lihat / ubah produk unit orang lain', async () => {
		login.userId = id.user;
		await expect(r.webProduk.load({ cookies, params: { slug: id.slugLain }, locals: { user: { id: id.user } } })).rejects.toMatchObject({ status: 403 });
		const fd = new FormData(); fd.set('productId', id.pLain); fd.set('showInPos', 'false');
		const hasil = await r.webProduk.actions.toggle({ request: new Request('http://x', { method: 'POST', body: fd }), cookies, params: { slug: id.slug }, locals: { user: { id: id.user } } });
		expect(hasil.success).toBe(false);
		expect((await db.query.products.findFirst({ where: eq(s.products.id, id.pLain) })).showInPos).toBe(1);
		const sendiri = await r.webProduk.load({ cookies, params: { slug: id.slug }, locals: { user: { id: id.user } } });
		expect(sendiri.products.map((/** @type {any} */ p) => p.id)).toEqual([id.p]);
	});
});
