/**
 * Penawaran & sales order (app): buat dengan item tervalidasi, alur status, konversi (hanya ACCEPTED, sekali),
 * tanpa pemasukan prematur, isolasi antar unit. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Penjualan app', () => {
	it('penawaran → sales order', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const quo = await import('../routes/api/app/crm/quotations/+server.js');
		const so = await import('../routes/api/app/crm/sales-orders/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `pa${t}`, email: `pa${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `pb${t}`, email: `pb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'PJ A', slug: `pj-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'PJ B', slug: `pj-b-${t}`, kategori: 'RETAIL_TOKO' });
		const unitA = ua.insertId;
		const unitB = ub.insertId;
		await db.insert(s.products).values({ id: `PA${t}`, slug: `pa-${t}`, userId: a.insertId, unitId: unitA, nama: 'Kopi A', hargaBeli: '5000', hargaJual: '10000', stok: 10 });
		await db.insert(s.products).values({ id: `PB${t}`, slug: `pb-${t}`, userId: b.insertId, unitId: unitB, nama: 'Kopi B', hargaBeli: '5000', hargaJual: '10000', stok: 10 });
		const [k] = await db.insert(s.crmContacts).values({ ownerId: a.insertId, unitId: unitA, nama: 'Pak Rudi' });
		const [kb] = await db.insert(s.crmContacts).values({ ownerId: b.insertId, unitId: unitB, nama: 'Orang B' });
		const mk = (method, body, qs = '') => ({
			request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
			cookies: { get() {} }, url: new URL(`http://x/?${qs}`)
		});
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		// validasi
		expect((await jalan(quo.POST, mk('POST', { unitId: unitA, items: [] }))).st).toBe(400);
		expect((await jalan(quo.POST, mk('POST', { unitId: unitA, items: [{ productId: `PA${t}`, qty: 0, price: 1 }] }))).st).toBe(400);
		expect((await jalan(quo.POST, mk('POST', { unitId: unitA, items: [{ productId: `PB${t}`, qty: 1, price: 1 }] }))).j.message).toMatch(/bukan milik unit/);
		expect((await jalan(quo.POST, mk('POST', { unitId: unitA, customerId: kb.insertId, items: [{ productId: `PA${t}`, qty: 1, price: 1 }] }))).st).toBe(404);

		// buat: total dihitung server dari item
		const q1 = await jalan(quo.POST, mk('POST', { unitId: unitA, customerId: k.insertId, notes: 'Penawaran uji', items: [{ productId: `PA${t}`, qty: 3, price: 9000 }, { productId: null, qty: 2, price: 1500 }] }));
		expect(q1.j.success).toBe(true);
		let list = (await jalan(quo.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(list[0]).toMatchObject({ id: q1.j.data.id, status: 'DRAFT', totalAmount: 30000, customerName: 'Pak Rudi' });
		expect(list[0].items.map((i) => [i.productName, i.qty, i.total])).toEqual([['Kopi A', 3, 27000], ['', 2, 3000]]);
		const qid = q1.j.data.id;

		// belum ACCEPTED → tidak bisa dikonversi
		expect((await jalan(quo.PUT, mk('PUT', { action: 'convert-to-order', quotationId: qid, unitId: unitA }))).st).toBe(400);
		expect((await jalan(quo.PUT, mk('PUT', { action: 'update-status', quotationId: qid, unitId: unitA, status: 'BASI' }))).st).toBe(400);
		for (const st of ['SENT', 'ACCEPTED']) expect((await jalan(quo.PUT, mk('PUT', { action: 'update-status', quotationId: qid, unitId: unitA, status: st }))).j.success).toBe(true);

		// konversi → sales order dengan item yang sama; kedua kali ditolak
		const konv = await jalan(quo.PUT, mk('PUT', { action: 'convert-to-order', quotationId: qid, unitId: unitA }));
		expect(konv.j.success).toBe(true);
		expect((await jalan(quo.PUT, mk('PUT', { action: 'convert-to-order', quotationId: qid, unitId: unitA }))).j.message).toMatch(/sudah dijadikan/);
		let orders = (await jalan(so.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(orders[0]).toMatchObject({ id: konv.j.data.orderId, status: 'PENDING', totalAmount: 30000, customerName: 'Pak Rudi' });
		expect(orders[0].items).toHaveLength(2);
		expect(orders[0].notes).toMatch(/Dari Quotation/);

		// sales order langsung: tidak mencatat pemasukan; status berjenjang & divalidasi
		const sebelum = (await db.select().from(s.transaksi).where(eq(s.transaksi.unitId, unitA))).length;
		const o2 = await jalan(so.POST, mk('POST', { unitId: unitA, items: [{ productId: `PA${t}`, qty: 1, price: 10000 }], notes: 'langsung' }));
		expect(o2.j.success).toBe(true);
		expect((await db.select().from(s.transaksi).where(eq(s.transaksi.unitId, unitA))).length).toBe(sebelum);
		expect((await jalan(so.PUT, mk('PUT', { orderId: o2.j.data.id, status: 'ZZZ' }))).st).toBe(400);
		expect((await jalan(so.PUT, mk('PUT', { orderId: o2.j.data.id, status: 'PROCESSING' }))).j.success).toBe(true);
		orders = (await jalan(so.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(orders.find((o) => o.id === o2.j.data.id).status).toBe('PROCESSING');

		// user lain tidak bisa mengubah sales order A
		login.userId = b.insertId;
		expect((await jalan(so.PUT, mk('PUT', { orderId: o2.j.data.id, status: 'CANCELLED' }))).st).toBe(404);
		expect((await jalan(quo.PUT, mk('PUT', { action: 'update-status', quotationId: qid, unitId: unitB, status: 'REJECTED' }))).st).toBe(404);
	});
});
