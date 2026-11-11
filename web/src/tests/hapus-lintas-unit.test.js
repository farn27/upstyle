/**
 * K-2: aksi hapus dengan id milik unit lain tidak boleh dibalas "berhasil dihapus".
 * Juga: akun COA yang sudah dipakai jurnal tidak boleh dihapus (FK cascade akan menghapus baris jurnal).
 * F-11: koreksi stok web menolak nilai negatif / bukan bilangan bulat dan varian milik produk lain.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));

describe.skipIf(!TEST_DB)('hapus & koreksi lintas unit', () => {
	/** @type {any} */ let db; /** @type {any} */ let schema; /** @type {any} */ let eq; /** @type {any} */ let lib;
	/** @type {Record<string, any>} */ const ids = {};

	const fd = (/** @type {Record<string, string>} */ o) => {
		const f = new FormData();
		for (const [k, v] of Object.entries(o)) f.set(k, v);
		return new Request('http://x', { method: 'POST', body: f });
	};

	beforeAll(async () => {
		schema = await import('../lib/server/schema.js');
		lib = await import('../lib/server/catatTransaksi.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const s = Date.now();
		const [u] = await db.insert(schema.users).values({ username: `hpsA${s}`, email: `hpsa${s}@contoh.id` });
		const [u2] = await db.insert(schema.users).values({ username: `hpsB${s}`, email: `hpsb${s}@contoh.id` });
		ids.userA = u.insertId; ids.userB = u2.insertId;
		const [a] = await db.insert(schema.unitBisnis).values({ userId: ids.userA, namaUnit: 'A', slug: `hps-a-${s}`, modalAwal: '0' });
		const [b] = await db.insert(schema.unitBisnis).values({ userId: ids.userB, namaUnit: 'B', slug: `hps-b-${s}`, modalAwal: '0' });
		ids.unitA = a.insertId; ids.slugA = `hps-a-${s}`; ids.unitB = b.insertId;
		for (const unit of [ids.unitA, ids.unitB]) await db.transaction((/** @type {any} */ tx) => lib.pastikanCoaStandar(tx, unit));
		// transaksi milik tenant B
		const akunB = await db.query.chartOfAccounts.findMany({ where: eq(schema.chartOfAccounts.unitId, ids.unitB) });
		const pend = akunB.find((/** @type {any} */ x) => x.tipeAkun === 'PENDAPATAN');
		const kas = akunB.find((/** @type {any} */ x) => /kas/i.test(x.namaAkun));
		const hasil = await db.transaction((/** @type {any} */ tx) => lib.catatTransaksi(tx, { unitId: ids.unitB, userId: ids.userB, kategori: 'MASUK', nominal: 5000, keterangan: 'trx B', coaId: pend.id, kasCoaId: kas.id }));
		ids.trxB = hasil.trxId;
		// produk A dengan varian, dan varian milik produk B
		ids.prodA = `HPS-A-${s}`; ids.prodB = `HPS-B-${s}`;
		await db.insert(schema.products).values({ id: ids.prodA, slug: `hps-pa-${s}`, nama: 'Gelas', userId: ids.userA, unitId: ids.unitA, hargaBeli: '1', hargaJual: '2', stok: 5 });
		await db.insert(schema.products).values({ id: ids.prodB, slug: `hps-pb-${s}`, nama: 'Piring', userId: ids.userB, unitId: ids.unitB, hargaBeli: '1', hargaJual: '2', stok: 7, hasVariant: 1 });
		ids.varB = `VAR-B-${s}`;
		await db.insert(schema.productVariants).values({ id: ids.varB, productId: ids.prodB, namaVariasi: 'Besar', hargaBeli: '1', hargaJual: '2', stok: 7 });
	});

	afterAll(async () => {
		for (const unit of [ids.unitA, ids.unitB]) if (unit) await db.delete(schema.unitBisnis).where(eq(schema.unitBisnis.id, unit));
		for (const user of [ids.userA, ids.userB]) if (user) await db.delete(schema.users).where(eq(schema.users.id, user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it('hapus transaksi tenant B lewat unit A → 404, data B tetap ada', async () => {
		login.userId = ids.userA;
		const history = await import('../routes/(app)/finance/[slug]/history/+page.server.js');
		const r = await history.actions.delete({ request: fd({ id: String(ids.trxB) }), params: { slug: ids.slugA }, cookies: { get: () => undefined } });
		expect(r.status).toBe(404);
		const masih = await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, ids.trxB) });
		expect(masih).toBeTruthy();
	});

	it('COA yang sudah dipakai jurnal tidak bisa dihapus', async () => {
		login.userId = ids.userB;
		const unitB = await db.query.unitBisnis.findFirst({ where: eq(schema.unitBisnis.id, ids.unitB) });
		const coa = await import('../routes/(app)/finance/[slug]/master-data/coa/+page.server.js');
		const akun = await db.query.chartOfAccounts.findMany({ where: eq(schema.chartOfAccounts.unitId, ids.unitB) });
		const pend = akun.find((/** @type {any} */ x) => x.tipeAkun === 'PENDAPATAN');
		const r = await coa.actions.deleteCoa({ request: fd({ id: String(pend.id) }), params: { slug: unitB.slug }, cookies: { get: () => undefined } });
		expect(r.status).toBe(409);
		expect(await db.query.chartOfAccounts.findFirst({ where: eq(schema.chartOfAccounts.id, pend.id) })).toBeTruthy();
		// id akun unit lain → 404, bukan "berhasil"
		const akunA = await db.query.chartOfAccounts.findFirst({ where: eq(schema.chartOfAccounts.unitId, ids.unitA) });
		const r2 = await coa.actions.deleteCoa({ request: fd({ id: String(akunA.id) }), params: { slug: unitB.slug }, cookies: { get: () => undefined } });
		expect(r2.status).toBe(404);
	});

	it('koreksi stok: nilai tidak sah & varian produk lain ditolak', async () => {
		const page = await import('../routes/(app)/finance/[slug]/produk/[productSlug]/stock_logs/+page.server.js');
		const locals = { user: { id: ids.userA, username: 'a' } };
		const jalan = (/** @type {Record<string, string>} */ o) => page.actions.default({ request: fd({ id: ids.prodA, alasan: 'OPNAME', ...o }), params: { slug: ids.slugA }, locals });
		for (const v of ['-3', 'abc', '2.5', '']) expect((await jalan({ stokBaru: v })).status).toBe(400);
		const r = await jalan({ stokBaru: '9', variants: JSON.stringify([{ id: ids.varB, stokBaru: 9 }]) });
		expect(r.status).toBe(400);
		const vb = await db.query.productVariants.findFirst({ where: eq(schema.productVariants.id, ids.varB) });
		expect(Number(vb.stok)).toBe(7);
		const ok = await jalan({ stokBaru: '8' });
		expect(ok).toMatchObject({ success: true, selisih: 3 });
	});
});
