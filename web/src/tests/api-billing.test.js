/**
 * Tes billing (#14): paket, langganan, pemakaian, upgrade via Midtrans Snap, konfirmasi pembayaran.
 * Midtrans di-mock (tidak ada transaksi sungguhan). Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
const midtrans = vi.hoisted(() => ({ status: 'settlement' }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/payment', async (asli) => ({
	...(await asli()),
	createSnapTransaction: async (/** @type {any} */ { userId, planId }) => ({ token: 'tok-123', redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/tok-123', order_id: `UPSTYLE-${planId.toUpperCase()}-${userId}-1700000000000` }),
	checkTransactionStatus: async () => ({ transaction_status: midtrans.status, fraud_status: 'accept' })
}));

describe.skipIf(!TEST_DB)('Billing', () => {
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
		for (const k of ['plans', 'subscription', 'usage', 'invoices', 'upgrade']) r[k] = await import(`../routes/api/app/billing/${k}/+server.js`);
		r.confirm = await import('../routes/api/app/billing/payment/confirm/+server.js');
		r.web = await import('../routes/(app)/settings/billing/+page.server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ba${t}`, email: `ba${t}@contoh.id`, role: 'free' });
		const [b] = await db.insert(s.users).values({ username: `bb${t}`, email: `bb${t}@contoh.id`, role: 'free' });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Unit Billing', slug: `ba-${t}`, modalAwal: '0' });
		id.unit = u.insertId;
		await db.insert(s.products).values({ id: `B1-${t}`, slug: `b1-${t}`, nama: 'X', userId: id.user, unitId: id.unit, hargaBeli: '1', hargaJual: '2', stok: 1 });
	});

	afterAll(async () => {
		if (id.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, id.unit));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	const get = async (/** @type {string} */ k) => (await r[k].GET({ cookies, request: new Request('http://x') })).json();
	/** @param {string} k @param {any} body */
	const post = (k, body) => r[k].POST({ cookies, request: new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) });

	it('paket, langganan & pemakaian sesuai web (Free Tier, 1 unit, 1 produk)', async () => {
		login.userId = id.user;
		const plans = await get('plans');
		expect(plans.data.map((/** @type {any} */ p) => p.id)).toEqual(['free', 'pro', 'enterprise']);
		expect(plans.data.find((/** @type {any} */ p) => p.id === 'free').isCurrent).toBe(true);
		expect(plans.data.find((/** @type {any} */ p) => p.id === 'pro').pricing.monthly).toBe(149000);
		const sub = await get('subscription');
		expect(sub.data).toMatchObject({ planId: 'free', planName: 'Free Tier', usage: { businessUnits: 1, products: 1 }, limits: { maxBusinessUnits: 3 } });
		expect((await get('usage')).data).toMatchObject({ businessUnits: 1, products: 1 });
		expect((await get('invoices')).data).toEqual([]);
		const web = await r.web.load({ cookies });
		expect(web.currentPlan).toMatchObject({ name: 'Free Tier', unitsUsed: 1, unitLimit: 3 });
	});

	it('upgrade: plan tidak valid ditolak; valid → link bayar Midtrans', async () => {
		login.userId = id.user;
		expect((await post('upgrade', { planId: 'gratis-selamanya' })).status).toBe(422);
		const res = await (await post('upgrade', { planId: 'pro' })).json();
		expect(res.data).toMatchObject({ amount: 149000, redirectUrl: expect.stringContaining('midtrans') });
		id.order = res.data.sessionId;
		expect(id.order).toBe(`UPSTYLE-PRO-${id.user}-1700000000000`);
	});

	it('konfirmasi: order milik user lain ditolak; pending tidak mengubah paket; lunas → Pro', async () => {
		login.userId = id.userLain;
		expect((await post('confirm', { sessionId: id.order })).status).toBe(404);

		login.userId = id.user;
		midtrans.status = 'pending';
		const pending = await (await post('confirm', { sessionId: id.order })).json();
		expect(pending.data.status).toBe('pending');
		expect((await db.query.users.findFirst({ where: eq(s.users.id, id.user) })).role).toBe('free');

		midtrans.status = 'settlement';
		const lunas = await (await post('confirm', { sessionId: id.order })).json();
		expect(lunas.data).toMatchObject({ status: 'success', planId: 'pro' });
		expect((await db.query.users.findFirst({ where: eq(s.users.id, id.user) })).role).toBe('pro');
		expect((await get('subscription')).data.planId).toBe('pro');
		// sudah Pro → upgrade ke Pro lagi ditolak
		expect((await post('upgrade', { planId: 'pro' })).status).toBe(400);
	});
});
