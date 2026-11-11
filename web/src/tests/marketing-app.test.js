/**
 * Marketing (app): lead dari app tersimpan lewat halaman "Input manual", lead tidak bocor antar unit,
 * bentuk data sesuai model app (nama, source, status, summary), transfer ke CRM. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Marketing app', () => {
	it('lead per unit + bentuk data', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const api = await import('../routes/api/app/marketing/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ma${t}`, email: `ma${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `mb${t}`, email: `mb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'MK A', slug: `mk-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'MK B', slug: `mk-b-${t}`, kategori: 'RETAIL_TOKO' });
		const mk = (method, body, qs = '') => ({
			request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
			cookies: { get() {} }, url: new URL(`http://x/?${qs}`)
		});
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		// lead dari app: tanpa landingPageId → halaman "Input manual" dibuat otomatis
		const l1 = await jalan(api.POST, mk('POST', { action: 'create-lead', lead: { unitId: ua.insertId, firstName: 'Dewi', lastName: 'Lestari', email: 'dewi@x.id', phone: '0813', notes: 'Sumber: ads' } }));
		expect(l1.j.success).toBe(true);
		// unit lain punya lead sendiri — tidak boleh muncul di unit A
		login.userId = b.insertId;
		expect((await jalan(api.POST, mk('POST', { action: 'create-lead', lead: { unitId: ub.insertId, firstName: 'Orang B' } }))).j.success).toBe(true);
		// unit milik orang lain ditolak
		expect((await jalan(api.POST, mk('POST', { action: 'create-lead', lead: { unitId: ua.insertId, firstName: 'Curi' } }))).st).toBeGreaterThanOrEqual(400);

		login.userId = a.insertId;
		await jalan(api.POST, mk('POST', { action: 'create-ad-tracker', tracker: { unitId: ua.insertId, platform: 'meta', spendAmount: 250000, impressions: 1000, clicks: 40, conversions: 3, trackingDate: '2026-11-01' } }));
		const d = (await jalan(api.GET, mk('GET', null, `unitId=${ua.insertId}`))).j.data;
		expect(d.leads).toHaveLength(1);
		expect(d.leads[0]).toMatchObject({ nama: 'Dewi Lestari', email: 'dewi@x.id', telepon: '0813', status: 'new', unitId: ua.insertId });
		expect(d.adTrackers[0]).toMatchObject({ unitId: ua.insertId, platform: 'meta', spend: 250000, period: '2026-11-01' });
		expect(d.summary).toMatchObject({ totalLeads: 1, convertedLeads: 0, totalSpend: 250000 });
		const dl = (await jalan(api.GET, mk('GET', null, `unitId=${ua.insertId}&type=leads`))).j.leads;
		expect(dl.map((x) => x.firstName)).toEqual(['Dewi']);

		// transfer ke CRM → status converted
		expect((await jalan(api.PUT, mk('PUT', { action: 'transfer-lead-to-crm', leadId: d.leads[0].id, unitId: ua.insertId }))).j.success).toBe(true);
		const d2 = (await jalan(api.GET, mk('GET', null, `unitId=${ua.insertId}`))).j.data;
		expect(d2.leads[0].status).toBe('converted');
		expect(d2.summary.convertedLeads).toBe(1);
		// kontak CRM benar-benar terbentuk; transfer kedua ditolak
		const kontak = await db.select().from(s.crmContacts).where(eq(s.crmContacts.unitId, ua.insertId));
		expect(kontak).toHaveLength(1);
		expect(kontak[0]).toMatchObject({ nama: 'Dewi Lestari', telepon: '0813', email: 'dewi@x.id', sumber: 'landing page' });
		expect((await jalan(api.PUT, mk('PUT', { action: 'transfer-lead-to-crm', leadId: d.leads[0].id, unitId: ua.insertId }))).st).toBe(400);
		login.userId = b.insertId;
		expect((await jalan(api.PUT, mk('PUT', { action: 'transfer-lead-to-crm', leadId: d.leads[0].id, unitId: ub.insertId }))).st).toBe(404);
	});
});
