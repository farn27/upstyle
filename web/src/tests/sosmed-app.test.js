/**
 * Sosmed (app): jadwal "YYYY-MM-DD HH:mm" tersimpan apa adanya (WIB), status dinormalkan huruf besar & divalidasi.
 * Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Sosmed app', () => {
	it('jadwal & status', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const api = await import('../routes/api/app/sosmed/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `sma${t}`, email: `sma${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'SM A', slug: `sm-a-${t}`, kategori: 'RETAIL_TOKO' });
		const mk = (method, body, qs = '') => ({ request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }), cookies: { get() {} }, url: new URL(`http://x/?${qs}`) });
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };
		login.userId = a.insertId;

		expect((await jalan(api.POST, mk('POST', { unitId: ua.insertId, platform: 'Instagram', caption: 'x', scheduledAt: 'besok pagi' }))).st).toBe(422);
		expect((await jalan(api.POST, mk('POST', { unitId: ua.insertId, platform: 'Instagram', caption: 'x', status: 'AKAN' }))).st).toBe(422);
		const p = await jalan(api.POST, mk('POST', { unitId: ua.insertId, platform: 'Instagram', caption: 'Promo akhir tahun', scheduledAt: '2026-12-01 09:30', status: 'scheduled' }));
		expect(p.j.success).toBe(true);
		const [row] = await db.select().from(s.socialPosts).where(eq(s.socialPosts.id, p.j.data.id));
		expect(row.scheduledAt).toBe('2026-12-01 09:30:00');
		expect(row.status).toBe('SCHEDULED');
		const daftar = (await jalan(api.GET, mk('GET', null, `unitId=${ua.insertId}`))).j.data;
		expect(daftar[0]).toMatchObject({ caption: 'Promo akhir tahun', status: 'SCHEDULED', scheduledAt: '2026-12-01 09:30:00' });

		expect((await jalan(api.PUT, mk('PUT', { id: p.j.data.id, scheduledAt: '', status: 'published' }))).j.success).toBe(true);
		const [row2] = await db.select().from(s.socialPosts).where(eq(s.socialPosts.id, p.j.data.id));
		expect(row2.scheduledAt).toBeNull();
		expect(row2.status).toBe('PUBLISHED');
	});
});
