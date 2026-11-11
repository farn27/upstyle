/**
 * Setor/tarik kas shift dari aplikasi HP (POST /api/app/pos/cash):
 *  - kas laci yang diharapkan (pos_shifts.kas_akhir) ikut berubah, sama seperti web — dulu tidak, sehingga
 *    selisih saat tutup shift dari HP selalu salah;
 *  - unit milik pengguna lain ditolak (dulu tidak dicek);
 *  - tarik melebihi isi laci ditolak.
 * Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('Kas shift HP', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {any} */ let kas;
	/** @type {Record<string, any>} */
	const id = {};
	const cookies = { get: () => undefined };
	/** @param {any} body */
	const post = (body) => kas.POST({ cookies, request: new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) });
	const kasAkhir = async () => Number((await db.select().from(s.posShifts).where(eq(s.posShifts.id, id.shift)))[0].kasAkhir);

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		kas = await import('../routes/api/app/pos/cash/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ka${t}`, email: `ka${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `kb${t}`, email: `kb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Kedai', slug: `ka-${t}`, modalAwal: '0' });
		id.unit = u.insertId;
		const [sh] = await db.insert(s.posShifts).values({ unitId: id.unit, userId: id.user, waktuBuka: '2026-11-11 08:00:00', modalAwal: '100000', kasAkhir: '150000', status: 'OPEN' });
		id.shift = sh.insertId;
	});

	afterAll(async () => {
		if (id.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, id.unit));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	it('setor & tarik mengubah kas laci yang diharapkan', async () => {
		login.userId = id.user;
		const r1 = await post({ shiftId: id.shift, unitId: id.unit, type: 'CASH_IN', amount: 20000, description: 'tambah receh' });
		expect(r1.status).toBe(200);
		expect(await kasAkhir()).toBe(170000);
		const r2 = await post({ shiftId: id.shift, unitId: id.unit, type: 'CASH_OUT', amount: 50000, description: 'setor bank' });
		expect(r2.status).toBe(200);
		expect(await kasAkhir()).toBe(120000);
	});

	it('tarik melebihi isi laci ditolak tanpa mengubah apa pun', async () => {
		login.userId = id.user;
		const r = await post({ shiftId: id.shift, unitId: id.unit, type: 'CASH_OUT', amount: 999999 });
		expect(r.status).toBe(409);
		expect(await kasAkhir()).toBe(120000);
	});

	it('pengguna lain tidak bisa mencatat kas di shift unit ini', async () => {
		login.userId = id.userLain;
		const r = await post({ shiftId: id.shift, unitId: id.unit, type: 'CASH_IN', amount: 1000 });
		expect(r.status).toBe(404);
		expect(await kasAkhir()).toBe(120000);
	});
});
