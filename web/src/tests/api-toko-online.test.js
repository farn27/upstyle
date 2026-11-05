/**
 * Tes toko online (#12): pengaturan toko & konfigurasi Midtrans — API mobile & form web.
 * Server key tidak boleh tersimpan / terkirim balik. Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Toko online', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};
	const cookies = { get: () => undefined };
	const RAHASIA = 'SB-Mid-server-RAHASIA-123';

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		r.toko = await import('../routes/api/app/ecommerce/settings/+server.js');
		r.bayar = await import('../routes/api/app/ecommerce/payment/+server.js');
		r.webToko = await import('../routes/(app)/ecommerce/[slug]/+page.server.js');
		r.webBayar = await import('../routes/(app)/ecommerce/[slug]/integrasi/+page.server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ta${t}`, email: `ta${t}@contoh.id` });
		id.user = a.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko A', slug: `toko-a-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko B', slug: `toko-b-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unit2 = u2.insertId; id.slug = `toko-a-${t}`; id.t = t;
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unit2]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		if (id.user) await db.delete(s.users).where(eq(s.users.id, id.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** @param {string} m @param {any} [body] */
	const req = (m, body) => new Request('http://x', body === undefined ? { method: m } : { method: m, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

	it('GET membuat pengaturan bawaan kalau belum ada', async () => {
		login.userId = id.user;
		const body = await (await r.toko.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('GET') })).json();
		expect(body.data).toMatchObject({ storefrontName: 'Toko A Store', domainSlug: id.slug, isActive: false });
		expect(body.data.payment.midtrans.configured).toBe(false);
	});

	it('PUT ubah nama, aktifkan; alamat toko dipakai unit lain → 409; format salah → 422', async () => {
		login.userId = id.user;
		const ok = await r.toko.PUT({ cookies, request: req('PUT', { unitId: id.unit, storefrontName: 'Toko Keren', isActive: true }) });
		expect((await ok.json()).data).toMatchObject({ storefrontName: 'Toko Keren', isActive: true });
		await r.toko.GET({ url: new URL(`http://x?unitId=${id.unit2}`), cookies, request: req('GET') });
		expect((await r.toko.PUT({ cookies, request: req('PUT', { unitId: id.unit2, domainSlug: id.slug }) })).status).toBe(409);
		expect((await r.toko.PUT({ cookies, request: req('PUT', { unitId: id.unit2, domainSlug: 'Toko Saya!' }) })).status).toBe(422);
	});

	it('konfigurasi Midtrans: server key tidak tersimpan & tidak dikirim balik', async () => {
		login.userId = id.user;
		const res = await r.bayar.PUT({ cookies, request: req('PUT', { unitId: id.unit, midtransClientKey: 'SB-Mid-client-abc', midtransServerKey: RAHASIA, midtransSandbox: true }) });
		const teks = await res.text();
		expect(res.status).toBe(200);
		expect(teks).not.toContain(RAHASIA);
		expect(JSON.parse(teks).data.midtrans).toMatchObject({ clientKey: 'SB-Mid-client-abc', configured: true, serverKeySet: true });
		const baris = await db.query.ecommerceSettings.findFirst({ where: eq(s.ecommerceSettings.unitId, id.unit) });
		expect(JSON.stringify(baris)).not.toContain(RAHASIA);
		const get = await (await r.toko.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('GET') })).text();
		expect(get).not.toContain(RAHASIA);
	});

	it('web: simpan pengaturan toko & konfigurasi bayar lewat form tetap jalan', async () => {
		login.userId = id.user;
		const fd = new FormData();
		fd.set('storefrontName', 'Toko Web'); fd.set('description', 'Deskripsi'); fd.set('domainSlug', `toko-web-${id.t}`); fd.set('isActive', 'true');
		const hasil = await r.webToko.actions.updateSettings({ request: new Request('http://x', { method: 'POST', body: fd }), params: { slug: id.slug }, cookies });
		expect(hasil.success).toBe(true);
		const baris = await db.query.ecommerceSettings.findFirst({ where: eq(s.ecommerceSettings.unitId, id.unit) });
		expect(baris).toMatchObject({ storefrontName: 'Toko Web', domainSlug: `toko-web-${id.t}` });

		const fb = new FormData();
		fb.set('midtrans_client_key', 'SB-Mid-client-web'); fb.set('midtrans_server_key', RAHASIA); fb.set('midtrans_sandbox', 'true');
		expect((await r.webBayar.actions.savePaymentConfig({ request: new Request('http://x', { method: 'POST', body: fb }), params: { slug: id.slug }, cookies })).success).toBe(true);
		const load = await r.webBayar.load({ params: { slug: id.slug }, cookies });
		expect(load.paymentConfig.midtrans).toMatchObject({ clientKey: 'SB-Mid-client-web', configured: true });
		expect(JSON.stringify(load)).not.toContain(RAHASIA);
	});
});
