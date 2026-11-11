/**
 * Laporan WA: semua periode berjalan tanpa galat SQL. Dulu "bulan_ini" gagal karena filter
 * tanggal untuk pos_orders hanya mengganti kemunculan pertama "tanggal".
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('laporan WA', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let eq;
	/** @type {Record<string, any>} */ const ids = {};
	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `wa${t}`, email: `wa${t}@x.id` });
		ids.user = u.insertId;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: ids.user, namaUnit: 'WA', slug: `wa-${t}`, modalAwal: '0' });
		ids.unit = unit.insertId;
		await db.insert(s.posOrders).values({ unitId: ids.unit, orderNumber: `WA-${t}`, createdBy: ids.user, subtotal: '10000', total: '10000', status: 'PAID' });
	});
	afterAll(async () => {
		if (ids.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, ids.unit));
		if (ids.user) await db.delete(s.users).where(eq(s.users.id, ids.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it.each(['hari_ini', 'kemarin', 'minggu_ini', 'bulan_ini'])('periode %s', async (periode) => {
		login.userId = ids.user;
		const api = await import('../routes/api/laporan-wa/+server.js');
		const r = await api.POST({ request: new Request('http://x/', { method: 'POST', body: JSON.stringify({ unitId: ids.unit, periode }), headers: { 'content-type': 'application/json' } }), cookies: { get() {} } });
		expect(r.status).toBe(200);
		const j = await r.json();
		expect(j.success).toBe(true);
		if (periode === 'hari_ini' || periode === 'bulan_ini') expect(JSON.stringify(j)).toContain('10.000');
	});
});
