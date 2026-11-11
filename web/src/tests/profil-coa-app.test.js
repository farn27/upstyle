/**
 * Profil (foto, validasi, email unik) dan akun induk COA lewat API app. Butuh TEST_DATABASE_URL.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

const mk = (method, body, qs = '') => ({
	request: new Request('http://x/' + qs, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
	cookies: { get() {} },
	url: new URL('http://x/' + qs)
});
const jalan = async (fn, req) => { const r = await fn(req); return { st: r.status, j: await r.json() }; };

describe.skipIf(!TEST_DB)('Profil & COA induk (app)', () => {
	it('profil: foto tersimpan & bisa dihapus, email ganda ditolak, nama min 3 huruf', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const api = await import('../routes/api/app/settings/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `pa${t}`, email: `pa${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `pb${t}`, email: `pb${t}@x.id`, role: 'enterprise' });
		login.userId = a.insertId;

		const ok = await jalan(api.PUT, mk('PUT', { mode: 'profile', name: `Budi ${t}`, email: `pa${t}@x.id`, avatarUrl: 'https://contoh.com/foto.jpg' }));
		expect(ok.j.success).toBe(true);
		const p1 = await jalan(api.GET, mk('GET', null, '?mode=profile'));
		expect(p1.j.data.avatarUrl).toBe('https://contoh.com/foto.jpg');
		expect(p1.j.data.username).toBe(`Budi ${t}`);

		const hapus = await jalan(api.PUT, mk('PUT', { mode: 'profile', name: `Budi ${t}`, avatarUrl: '' }));
		expect(hapus.j.success).toBe(true);
		expect((await jalan(api.GET, mk('GET', null, '?mode=profile'))).j.data.avatarUrl).toBe('');

		const ganda = await jalan(api.PUT, mk('PUT', { mode: 'profile', email: `pb${t}@x.id` }));
		expect(ganda.st).toBe(409);
		const pendek = await jalan(api.PUT, mk('PUT', { mode: 'profile', name: 'ab' }));
		expect(pendek.st).toBe(422);
		const urlRusak = await jalan(api.PUT, mk('PUT', { mode: 'profile', avatarUrl: 'bukan-url' }));
		expect(urlRusak.st).toBe(422);
		void b;
	});

	it('COA: akun induk satu unit, tanpa lingkaran, bisa dilepas', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const api = await import('../routes/api/app/finance/coa/+server.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `pc${t}`, email: `pc${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: u.insertId, namaUnit: 'COA A', slug: `coa-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: u.insertId, namaUnit: 'COA B', slug: `coa-b-${t}`, kategori: 'RETAIL_TOKO' });
		login.userId = u.insertId;
		const buat = (unitId, kode, extra = {}) => jalan(api.POST, mk('POST', { unitId, kodeAkun: kode, namaAkun: `Akun ${kode}`, tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', ...extra }));

		const induk = await buat(ua.insertId, '1-1000');
		expect(induk.j.success).toBe(true);
		const anak = await buat(ua.insertId, '1-1001', { parentId: induk.j.data.id });
		expect(anak.j.success).toBe(true);
		const di = await db.query.chartOfAccounts.findFirst({ where: (c, { eq }) => eq(c.id, anak.j.data.id) });
		expect(di.parentId).toBe(induk.j.data.id);

		// induk dari unit lain ditolak
		const lain = await buat(ub.insertId, '1-2000', { parentId: induk.j.data.id });
		expect(lain.st).toBe(422);
		// diri sendiri & lingkaran ditolak
		const diri = await jalan(api.PUT, mk('PUT', { id: induk.j.data.id, parentId: induk.j.data.id }));
		expect(diri.st).toBe(422);
		const lingkar = await jalan(api.PUT, mk('PUT', { id: induk.j.data.id, parentId: anak.j.data.id }));
		expect(lingkar.st).toBe(422);
		// lepas dari induk
		const lepas = await jalan(api.PUT, mk('PUT', { id: anak.j.data.id, parentId: 0 }));
		expect(lepas.j.success).toBe(true);
		const d2 = await db.query.chartOfAccounts.findFirst({ where: (c, { eq }) => eq(c.id, anak.j.data.id) });
		expect(d2.parentId).toBeNull();
	});
});
