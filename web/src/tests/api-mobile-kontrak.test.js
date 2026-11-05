/**
 * Tes kontrak API yang dibaca app mobile (UpstyleApi.kt): bentuk balasan harus
 * cocok dengan model Kotlin. Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));

describe.skipIf(!TEST_DB)('Kontrak API mobile', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};
	const cookies = { get: () => undefined };

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		r.approvals = await import('../routes/api/app/hr/approvals/+server.js');
		r.katalog = await import('../routes/api/app/katalog/+server.js');
		r.plan = await import('../routes/api/app/business-plan/+server.js');
		r.marketing = await import('../routes/api/app/marketing/+server.js');

		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ka${t}`, email: `ka${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `kb${t}`, email: `kb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko Kontrak', slug: `toko-k-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Lain', slug: `lain-k-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId;
		const [e] = await db.insert(s.employees).values({ companyId: id.unit, fullName: 'Budi', position: 'Kasir', salary: '1', status: 'active' });
		id.emp = e.insertId;
		await db.insert(s.approvalRequests).values({
			module: 'REIMBURSEMENT', referenceId: `R-${t}`, requesterId: String(id.emp), unitId: id.unit, actionType: 'CREATE',
			dataAfter: { amount: 50000, description: 'Bensin' }, status: 'PENDING', currentLevel: 1, maxLevel: 1
		});
		await db.insert(s.products).values({ id: `PK-${t}`, slug: `pk-${t}`, nama: 'Kopi', userId: id.user, unitId: id.unit, hargaBeli: '1', hargaJual: '2', stok: 3, status: 'active' });
		const { businessPlans } = await import('../lib/server/businessPlanSchema.js');
		id.bp = businessPlans;
		await db.insert(businessPlans).values({ userId: id.user, unitId: id.unit, namaBisnis: 'Kedai', kategori: 'FNB_RESTO', deskripsi: 'Kopi susu', aiSummary: 'Ringkas' });
		const [lp] = await db.insert(s.landingPages).values({ unitId: id.unitLain, pageSlug: `lp-lain-${t}`, title: 'LP lain' });
		id.lpLain = lp.insertId;
		const [lp2] = await db.insert(s.landingPages).values({ unitId: id.unit, pageSlug: `lp-saya-${t}`, title: 'LP saya' });
		id.lpSaya = lp2.insertId;
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		if (id.emp) await db.delete(s.employees).where(eq(s.employees.id, id.emp));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	it('approvals: `data` berisi pending/approved/rejected dengan field ApprovalRequest', async () => {
		login.userId = id.user;
		const res = await r.approvals.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.success).toBe(true);
		const item = body.data.pending[0];
		expect(item).toMatchObject({ unitId: id.unit, employeeId: id.emp, employeeName: 'Budi', type: 'reimbursement', amount: 50000, description: 'Bensin' });
	});

	it('katalog: `data` = { settings, products } sesuai KatalogData', async () => {
		login.userId = id.user;
		const res = await r.katalog.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.data.settings).toMatchObject({ unitId: id.unit, namaPortal: 'Toko Kontrak', totalProducts: 1, publishedProducts: 1 });
		expect(body.data.products[0]).toMatchObject({ nama: 'Kopi', hargaJual: 2, isPublished: true, stok: 3 });
	});

	it('business plan: daftar memuat deskripsi & ringkasan untuk app', async () => {
		login.userId = id.user;
		const res = await r.plan.GET({ url: new URL('http://x'), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.data[0]).toMatchObject({ unitId: id.unit, namaBisnis: 'Kedai', deskripsi: 'Kopi susu', aiSummary: 'Ringkas' });
	});

	it('lead baru: wajib landing page milik unit sendiri', async () => {
		login.userId = id.user;
		/** @param {any} lead */
		const kirim = (lead) => r.marketing.POST({
			cookies,
			request: new Request('http://x', { method: 'POST', body: JSON.stringify({ action: 'create-lead', lead }), headers: { 'content-type': 'application/json' } })
		});
		expect((await kirim({ firstName: 'Tanpa LP' })).status).toBe(422);
		expect((await kirim({ firstName: 'Nyusup', landingPageId: id.lpLain })).status).toBe(422);
		expect((await kirim({ firstName: 'Sah', landingPageId: id.lpSaya })).status).toBe(200);
	});
});
