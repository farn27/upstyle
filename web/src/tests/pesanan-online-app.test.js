/**
 * Pesanan toko online (app): daftar berisi status gabungan + item bernama, buat pesanan memvalidasi produk & menghitung
 * total di server, ubah status (lama & baru) divalidasi, isolasi antar user. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Pesanan online app', () => {
	it('buat, daftar, ubah status', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const api = await import('../routes/api/app/orders/+server.js');
		const detail = await import('../routes/api/app/orders/[orderId]/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `oa${t}`, email: `oa${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `ob${t}`, email: `ob${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'OL A', slug: `ol-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'OL B', slug: `ol-b-${t}`, kategori: 'RETAIL_TOKO' });
		const unitA = ua.insertId;
		await db.insert(s.products).values({ id: `OA${t}`, slug: `oa-${t}`, userId: a.insertId, unitId: unitA, nama: 'Kaos Polos', hargaBeli: '30000', hargaJual: '60000', stok: 10 });
		await db.insert(s.products).values({ id: `OB${t}`, slug: `ob-${t}`, userId: b.insertId, unitId: ub.insertId, nama: 'Milik B', hargaBeli: '1', hargaJual: '2', stok: 1 });
		const mk = (method, body, qs = '', params = {}) => ({
			request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
			cookies: { get() {} }, url: new URL(`http://x/?${qs}`), params
		});
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		expect((await jalan(api.POST, mk('POST', { unitId: unitA, customerName: 'Budi', items: [{ productId: `OB${t}`, qty: 1, price: 1 }] }))).j.message).toMatch(/bukan milik unit/);
		const p = await jalan(api.POST, mk('POST', { unitId: unitA, customerName: 'Budi', customerPhone: '0812', shippingAddress: 'Jl. A', discountAmount: 5000, subtotal: 1, totalAmount: 1, items: [{ productId: `OA${t}`, qty: 2, price: 60000 }] }));
		expect(p.j.success).toBe(true);
		const id = p.j.data.orderId;

		let list = (await jalan(api.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(list[0]).toMatchObject({ id, customerName: 'Budi', subtotal: 120000, discountAmount: 5000, totalAmount: 115000, status: 'PENDING', paymentStatus: 'PENDING', shippingStatus: 'PENDING' });
		expect(list[0].items[0]).toMatchObject({ productName: 'Kaos Polos', qty: 2, total: 120000 });

		// status baru (dua sumbu) dan lama (gabungan) memetakan ke enum web; nilai ngawur ditolak
		const put = (body) => jalan(detail.PUT, mk('PUT', body, '', { orderId: String(id) }));
		expect((await put({ paymentStatus: 'LUNAS' })).st).toBe(400);
		expect((await put({ status: 'Teleport' })).st).toBe(400);
		expect((await put({ paymentStatus: 'paid' })).j.success).toBe(true);
		list = (await jalan(api.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(list[0].status).toBe('PAID');
		expect((await put({ shippingStatus: 'SHIPPED' })).j.success).toBe(true);
		expect((await jalan(api.GET, mk('GET', null, `unitId=${unitA}&status=shipped`))).j.data).toHaveLength(1);
		expect((await put({ status: 'Completed' })).j.success).toBe(true);
		let [row] = await db.select().from(s.ecommerceOrders).where(eq(s.ecommerceOrders.id, id));
		expect(row).toMatchObject({ paymentStatus: 'PAID', shippingStatus: 'DELIVERED' });
		expect((await put({ status: 'Cancelled' })).j.success).toBe(true);
		[row] = await db.select().from(s.ecommerceOrders).where(eq(s.ecommerceOrders.id, id));
		expect(row.paymentStatus).toBe('FAILED');
		const det = (await jalan(detail.GET, mk('GET', null, '', { orderId: String(id) }))).j.data;
		expect(det).toMatchObject({ status: 'CANCELLED', items: [{ productName: 'Kaos Polos' }] });

		// user lain
		login.userId = b.insertId;
		expect((await jalan(detail.GET, mk('GET', null, '', { orderId: String(id) }))).st).toBe(403);
		expect((await put({ shippingStatus: 'SHIPPED' })).st).toBe(403);
	});
});
