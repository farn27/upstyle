/**
 * Stok opname (app): gudang bawaan dibuat otomatis, stok sistem diambil dari DB, selisih menyesuaikan stok + log + jurnal,
 * produk unit lain ditolak, daftar riwayat sesuai model app. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Stok opname app', () => {
	it('opname menyesuaikan stok dan menjurnal selisih', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		const api = await import('../routes/api/app/products/stock-opname/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `oa${t}`, email: `oa${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'OP A', slug: `op-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'OP B', slug: `op-b-${t}`, kategori: 'RETAIL_TOKO' });
		const unit = ua.insertId;
		await pastikanCoaStandar(db, unit);
		const mkp = (id, nama, stok, beli) => db.insert(s.products).values({ id, slug: id.toLowerCase(), userId: a.insertId, unitId: unit, nama, hargaBeli: String(beli), hargaJual: '9999', stok });
		await mkp(`OP1${t}`, 'Gula', 10, 1000);
		await mkp(`OP2${t}`, 'Teh', 5, 2000);
		await mkp(`OP3${t}`, 'Kopi', 7, 3000);
		await db.insert(s.products).values({ id: `OPX${t}`, slug: `opx-${t}`, userId: a.insertId, unitId: ub.insertId, nama: 'Unit B', hargaBeli: '1', hargaJual: '2', stok: 1 });
		const mk = (method, body, qs = '') => ({ request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }), cookies: { get() {} }, url: new URL(`http://x/?${qs}`) });
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };
		login.userId = a.insertId;

		expect((await jalan(api.POST, mk('POST', { unitId: unit, items: [] }))).st).toBe(400);
		expect((await jalan(api.POST, mk('POST', { unitId: unit, items: [{ productId: `OPX${t}`, actualStock: 1 }] }))).st).toBe(404);
		expect((await jalan(api.POST, mk('POST', { unitId: unit, items: [{ productId: `OP1${t}`, actualStock: -2 }] }))).st).toBe(400);

		// Gula 10→8 (kurang 2 × 1000), Teh 5→6 (lebih 1 × 2000), Kopi 7→7 (sama)
		const r = await jalan(api.POST, mk('POST', { unitId: unit, notes: 'Opname akhir bulan', items: [
			{ productId: `OP1${t}`, actualStock: 8 }, { productId: `OP2${t}`, actualStock: 6 }, { productId: `OP3${t}`, actualStock: 7 }] }));
		expect(r.j.success).toBe(true);
		expect(r.j.data).toMatchObject({ dihitung: 3, selisih: 2, nilaiKurang: 2000, nilaiLebih: 2000 });
		const stok = Object.fromEntries((await db.select().from(s.products).where(eq(s.products.unitId, unit))).map((p) => [p.id, p.stok]));
		expect(stok).toMatchObject({ [`OP1${t}`]: 8, [`OP2${t}`]: 6, [`OP3${t}`]: 7 });
		const logs = await db.select().from(s.stockLogs).where(eq(s.stockLogs.unitId, unit));
		expect(logs.filter((l) => l.alasan === 'OPNAME')).toHaveLength(2);
		const jr = await db.select().from(s.journalEntries).where(eq(s.journalEntries.unitId, unit));
		const jo = jr.find((j) => j.sourceType === 'INVENTORY');
		expect(jo).toBeTruthy();
		expect(Number(jo.totalDebit)).toBe(4000);
		const gudang = await db.select().from(s.warehouses).where(eq(s.warehouses.unitId, unit));
		expect(gudang).toHaveLength(1);

		const daftar = (await jalan(api.GET, mk('GET', null, `unitId=${unit}`))).j.data;
		expect(daftar[0]).toMatchObject({ status: 'COMPLETED', notes: 'Opname akhir bulan', warehouseId: gudang[0].id });
		expect(daftar[0].items.map((i) => [i.productName, i.systemStock, i.actualStock, i.difference]).sort()).toEqual([['Gula', 10, 8, -2], ['Kopi', 7, 7, 0], ['Teh', 5, 6, 1]]);
	});
});
