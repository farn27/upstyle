/**
 * Tes guard unit API mobile (/api/app/*): unitId di query / body JSON harus milik user.
 * Bagian DB hanya jalan kalau TEST_DATABASE_URL diset (database khusus tes).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { unitIdDariBody } from '../lib/server/apiUnitGuard.js';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
vi.mock('$env/dynamic/private', () => ({ env: process.env }));

describe('unitIdDariBody', () => {
	it('membaca unitId level atas dan satu level di dalam', () => {
		expect(unitIdDariBody({ unitId: 5 })).toEqual([5]);
		expect(unitIdDariBody({ transaction: { unitId: '7' } })).toEqual([7]);
		expect(unitIdDariBody({ unit_id: 3, asset: { unitId: 4 } })).toEqual([3, 4]);
	});
	it('membaca unitId di array level atas', () => {
		expect(unitIdDariBody([{ unitId: 1 }, { unitId: 2 }])).toEqual([1, 2]);
		expect(unitIdDariBody({ items: [{ unitId: 9 }] })).toEqual([9]);
	});
	it('nilai aneh jadi NaN (ditolak), kosong diabaikan', () => {
		expect(unitIdDariBody({ unitId: 'abc' })).toEqual([NaN]);
		expect(unitIdDariBody({ unitId: null, x: { unitId: '' } })).toEqual([]);
		expect(unitIdDariBody(null)).toEqual([]);
	});
});

describe.skipIf(!TEST_DB)('guardUnitApiApp — database sungguhan', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let schema;
	/** @type {any} */ let guard;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const ids = {};

	beforeAll(async () => {
		schema = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ guardUnitApiApp: guard } = await import('../lib/server/apiUnitGuard.js'));
		({ eq } = await import('drizzle-orm'));
		const s = Date.now();
		const [a] = await db.insert(schema.users).values({ username: `ga${s}`, email: `ga${s}@contoh.id` });
		const [b] = await db.insert(schema.users).values({ username: `gb${s}`, email: `gb${s}@contoh.id` });
		ids.userA = a.insertId;
		ids.userB = b.insertId;
		const [ua] = await db.insert(schema.unitBisnis).values({ userId: ids.userA, namaUnit: 'A', slug: `ga-${s}`, modalAwal: '0' });
		const [ua2] = await db.insert(schema.unitBisnis).values({ userId: ids.userA, namaUnit: 'A2', slug: `ga2-${s}`, modalAwal: '0' });
		const [ub] = await db.insert(schema.unitBisnis).values({ userId: ids.userB, namaUnit: 'B', slug: `gb-${s}`, modalAwal: '0' });
		ids.unitA = ua.insertId;
		ids.unitA2 = ua2.insertId;
		ids.unitB = ub.insertId;
	});

	afterAll(async () => {
		for (const u of [ids.unitA, ids.unitA2, ids.unitB]) if (u) await db.delete(schema.unitBisnis).where(eq(schema.unitBisnis.id, u));
		for (const u of [ids.userA, ids.userB]) if (u) await db.delete(schema.users).where(eq(schema.users.id, u));
	});

	/** @param {string} path @param {any} [body] @param {string} [method] */
	const ev = (path, body, method = body ? 'POST' : 'GET') => {
		const url = new URL(`http://x${path}`);
		const request = new Request(url, {
			method,
			...(body !== undefined ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {})
		});
		return { url, request };
	};

	it('unit sendiri lewat query → lolos', async () => {
		expect(await guard(db, ev(`/api/app/finance/coa?unitId=${ids.unitA}`), ids.userA)).toBeNull();
	});
	it('unit orang lain lewat query → 404', async () => {
		const res = await guard(db, ev(`/api/app/hr?unitId=${ids.unitB}`), ids.userA);
		expect(res?.status).toBe(404);
	});
	it('unit orang lain di body bersarang → 404', async () => {
		const res = await guard(db, ev('/api/app/finance', { transaction: { unitId: ids.unitB } }), ids.userA);
		expect(res?.status).toBe(404);
	});
	it('campuran unit sendiri + orang lain → 404', async () => {
		const res = await guard(db, ev(`/api/app/finance/coa?unitId=${ids.unitA}`, { unitId: ids.unitB }, 'PUT'), ids.userA);
		expect(res?.status).toBe(404);
	});
	it('dua unit sendiri → lolos', async () => {
		expect(await guard(db, ev(`/api/app/x?unitId=${ids.unitA}`, { unitId: ids.unitA2 }, 'PUT'), ids.userA)).toBeNull();
	});
	it('unitId bukan angka → 404', async () => {
		expect((await guard(db, ev('/api/app/hr?unitId=abc'), ids.userA))?.status).toBe(404);
	});
	it('tanpa unitId / bukan /api/app / tanpa login → tidak diblok di sini', async () => {
		expect(await guard(db, ev('/api/app/settings'), ids.userA)).toBeNull();
		expect(await guard(db, ev(`/api/payment/snap?unitId=${ids.unitB}`), ids.userA)).toBeNull();
		expect(await guard(db, ev(`/api/app/hr?unitId=${ids.unitB}`), null)).toBeNull();
	});
	it('body tetap bisa dibaca endpoint setelah dicek', async () => {
		const e = ev('/api/app/finance', { transaction: { unitId: ids.unitA, nominal: 5 } });
		expect(await guard(db, e, ids.userA)).toBeNull();
		expect(await e.request.json()).toEqual({ transaction: { unitId: ids.unitA, nominal: 5 } });
	});
});

// ─── Lewat hooks.server.js sungguhan (memastikan guard benar-benar terpasang) ──
vi.mock('$lib/server/session', () => ({ getUserIdFromSession: async (/** @type {string} */ t) => Number(t) || null }));
vi.mock('$lib/server/redis', () => ({ redis: { get: async () => null, set: async () => 'OK', keys: async () => [], del: async () => 0 } }));

describe.skipIf(!TEST_DB)('hooks.server.js — /api/app/* menolak unit orang lain', () => {
	/** @type {any} */ let handle;
	/** @type {any} */ let db;
	/** @type {any} */ let schema;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const ids = {};
	beforeAll(async () => {
		({ handle } = await import('../hooks.server.js'));
		schema = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const s = Date.now() + 1;
		const [a] = await db.insert(schema.users).values({ username: `ha${s}`, email: `ha${s}@contoh.id` });
		const [b] = await db.insert(schema.users).values({ username: `hb${s}`, email: `hb${s}@contoh.id` });
		ids.userA = a.insertId; ids.userB = b.insertId;
		const [ua] = await db.insert(schema.unitBisnis).values({ userId: ids.userA, namaUnit: 'A', slug: `ha-${s}`, modalAwal: '0' });
		const [ub] = await db.insert(schema.unitBisnis).values({ userId: ids.userB, namaUnit: 'B', slug: `hb-${s}`, modalAwal: '0' });
		ids.unitA = ua.insertId; ids.unitB = ub.insertId;
	});
	afterAll(async () => {
		for (const u of [ids.unitA, ids.unitB]) if (u) await db.delete(schema.unitBisnis).where(eq(schema.unitBisnis.id, u));
		for (const u of [ids.userA, ids.userB]) if (u) await db.delete(schema.users).where(eq(schema.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});
	/** @param {string} path */
	const panggil = async (path) => {
		let lanjut = false;
		const url = new URL(`http://x${path}`);
		const res = await handle({
			event: {
				url,
				request: new Request(url, { headers: { authorization: `Bearer ${ids.userA}` } }),
				cookies: { get: () => undefined },
				locals: {}
			},
			resolve: async () => { lanjut = true; return new Response('{}', { status: 200 }); }
		});
		return { status: res.status, lanjut };
	};
	it('unit orang lain → 404, endpoint tidak dipanggil', async () => {
		expect(await panggil(`/api/app/hr?unitId=${ids.unitB}`)).toEqual({ status: 404, lanjut: false });
	});
	it('unit sendiri → diteruskan ke endpoint', async () => {
		expect(await panggil(`/api/app/hr?unitId=${ids.unitA}`)).toEqual({ status: 200, lanjut: true });
	});
});
