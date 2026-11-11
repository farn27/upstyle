/**
 * Landing page (app): alamat /w/lp/<slug> unik se-server — slug sama otomatis diberi akhiran, ubah ke slug terpakai ditolak.
 * Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Landing page app', () => {
	it('slug unik', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const api = await import('../routes/api/app/landing-page/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `la${t}`, email: `la${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `lb${t}`, email: `lb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'LP A', slug: `lp-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'LP B', slug: `lp-b-${t}`, kategori: 'RETAIL_TOKO' });
		const mk = (method, body) => ({ request: new Request('http://x/', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), cookies: { get() {} }, url: new URL('http://x/') });
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };
		const slug = `promo-${t}`;

		login.userId = a.insertId;
		const p1 = await jalan(api.POST, mk('POST', { unitId: ua.insertId, pageSlug: slug.toUpperCase() + ' Hebat!', title: 'Promo A', templateId: 'leadgen' }));
		expect(p1.j.success).toBe(true);
		expect(p1.j.data.pageSlug).toBe(`promo-${t}-hebat`);
		// unit lain memakai slug yang sama → otomatis dibedakan, bukan gagal
		login.userId = b.insertId;
		const p2 = await jalan(api.POST, mk('POST', { unitId: ub.insertId, pageSlug: `promo-${t}-hebat`, title: 'Promo B' }));
		expect(p2.j.success).toBe(true);
		expect(p2.j.data.pageSlug).not.toBe(`promo-${t}-hebat`);
		expect(p2.j.data.pageSlug.startsWith(`promo-${t}-hebat-`)).toBe(true);
		// ubah ke slug yang dipakai halaman lain → 409
		const ubah = await jalan(api.PUT, mk('PUT', { id: p2.j.data.id, unitId: ub.insertId, pageSlug: `promo-${t}-hebat` }));
		expect(ubah.st).toBe(409);
		const ok = await jalan(api.PUT, mk('PUT', { id: p2.j.data.id, unitId: ub.insertId, pageSlug: `khusus-b-${t}` }));
		expect(ok.j.success).toBe(true);
		const [row] = await db.select().from(s.landingPages).where(eq(s.landingPages.id, p2.j.data.id));
		expect(row.pageSlug).toBe(`khusus-b-${t}`);
	});
});
