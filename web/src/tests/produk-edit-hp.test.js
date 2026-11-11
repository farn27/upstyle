/**
 * Edit produk dari aplikasi HP dengan payload persis seperti UpstyleApi.simpanProdukForm:
 * SKU kosong tidak boleh membuat bentrok (kolom unik), produk tanpa user_id = login tetap bisa diedit,
 * SKU yang sudah dipakai produk lain dibalas 409 dengan pesan jelas.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));

describe.skipIf(!TEST_DB)('edit produk dari HP', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let eq; /** @type {any} */ let api;
	/** @type {Record<string, any>} */ const ids = {};
	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		api = await import('../routes/api/app/products/+server.js');
		const t = Date.now(); ids.t = t;
		const [u] = await db.insert(s.users).values({ username: `edh${t}`, email: `edh${t}@x.id` });
		const [u2] = await db.insert(s.users).values({ username: `edh2${t}`, email: `edh2${t}@x.id` });
		ids.user = u.insertId; ids.user2 = u2.insertId;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: ids.user, namaUnit: 'E', slug: `edh-${t}`, modalAwal: '0' });
		ids.unit = unit.insertId;
		// p1: dibuat "orang lain" di unit ini (mis. hasil impor/template) → user_id ≠ pemilik
		await db.insert(s.products).values([
			{ id: `EDH1-${t}`, slug: `edh1-${t}`, nama: 'Kopi', sku: `K1-${t}`, userId: ids.user2, unitId: ids.unit, hargaBeli: '1000', hargaJual: '2000', stok: 5 },
			{ id: `EDH2-${t}`, slug: `edh2-${t}`, nama: 'Teh', sku: `K2-${t}`, userId: ids.user, unitId: ids.unit, hargaBeli: '1000', hargaJual: '2000', stok: 5 }
		]);
	});
	afterAll(async () => {
		if (ids.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, ids.unit));
		for (const u of [ids.user, ids.user2]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	const put = async (/** @type {any} */ body) => {
		const r = await api.PUT({ request: new Request('http://x/', { method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), cookies: { get() {} } });
		return { status: r.status, j: await r.json() };
	};
	const payload = (/** @type {string} */ id, /** @type {any} */ x = {}) => ({ id, unitId: ids.unit, nama: 'Kopi Susu', jenis: 'BARANG_JADI', sku: '', hargaBeli: 1500, hargaJual: 3000, stok: 7, minStok: 2, barcode: null, kategoriId: null, foto: null, ...x });

	it('SKU kosong pada dua produk: keduanya tersimpan, SKU lama dipertahankan', async () => {
		login.userId = ids.user;
		const a = await put(payload(`EDH1-${ids.t}`));
		expect(a).toMatchObject({ status: 200, j: { success: true } });
		const b = await put(payload(`EDH2-${ids.t}`, { nama: 'Teh Manis' }));
		expect(b).toMatchObject({ status: 200, j: { success: true } });
		const [p1] = await db.select().from(s.products).where(eq(s.products.id, `EDH1-${ids.t}`));
		expect(p1).toMatchObject({ nama: 'Kopi Susu', sku: `K1-${ids.t}`, stok: 7 });
		expect(Number(p1.hargaJual)).toBe(3000);
	});

	it('SKU milik produk lain → 409 dengan pesan jelas', async () => {
		login.userId = ids.user;
		const r = await put(payload(`EDH1-${ids.t}`, { sku: `K2-${ids.t}` }));
		expect(r.status).toBe(409);
		expect(r.j.message).toMatch(/SKU sudah dipakai/);
	});
});
