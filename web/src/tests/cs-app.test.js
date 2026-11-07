/**
 * Customer service (app): tiket menyimpan pelanggan & deskripsi, status/prioritas divalidasi (menerima "In Progress"),
 * balasan, daftar menampilkan pesan terakhir, isolasi antar user. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('CS app', () => {
	it('tiket end-to-end', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const cs = await import('../routes/api/app/cs/+server.js');
		const detail = await import('../routes/api/app/cs/[ticketId]/+server.js');
		const reply = await import('../routes/api/app/cs/[ticketId]/reply/+server.js');
		const pesan = await import('../routes/api/app/cs/[ticketId]/messages/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `sa${t}`, email: `sa${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `sb${t}`, email: `sb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'CS A', slug: `cs-a-${t}`, kategori: 'RETAIL_TOKO' });
		const unitA = ua.insertId;
		const mk = (method, body, qs = '', params = {}) => ({
			request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
			cookies: { get() {} }, url: new URL(`http://x/?${qs}`), params
		});
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		const p = await jalan(cs.POST, mk('POST', { action: 'create', subject: 'Pesanan telat', customerName: 'Bu Ani', priority: 'high', message: 'Belum sampai 3 hari', unitId: unitA }));
		expect(p.j.success).toBe(true);
		const id = p.j.data.id;
		// pelanggan yang sama dipakai ulang (tidak membuat kontak ganda)
		await jalan(cs.POST, mk('POST', { subject: 'Tanya stok', customerName: 'Bu Ani', unitId: unitA }));
		expect((await db.select().from(s.crmContacts).where(eq(s.crmContacts.unitId, unitA))).length).toBe(1);

		let daftar = (await jalan(cs.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		const tk = daftar.find((x) => x.id === id);
		expect(tk).toMatchObject({ subject: 'Pesanan telat', customerName: 'Bu Ani', priority: 'HIGH', status: 'OPEN', description: 'Belum sampai 3 hari', lastMessage: 'Belum sampai 3 hari' });

		// status: format aplikasi lama ("In Progress") diterima, nilai ngawur ditolak
		expect((await jalan(detail.PUT, mk('PUT', { status: 'In Progress' }, '', { ticketId: String(id) }))).j.success).toBe(true);
		expect((await jalan(detail.PUT, mk('PUT', { status: 'Selesai Banget' }, '', { ticketId: String(id) }))).st).toBe(400);
		expect((await jalan(detail.PUT, mk('PUT', { priority: 'urgent' }, '', { ticketId: String(id) }))).j.success).toBe(true);
		expect((await jalan(detail.PUT, mk('PUT', { priority: 'gawat' }, '', { ticketId: String(id) }))).st).toBe(400);
		let [row] = await db.select().from(s.supportTickets).where(eq(s.supportTickets.id, id));
		expect(row).toMatchObject({ status: 'IN_PROGRESS', priority: 'URGENT' });

		// balas → pesan agen + status berjalan; resolve mengisi resolvedAt
		expect((await jalan(reply.POST, mk('POST', { message: 'Kami cek ke kurir ya' }, '', { ticketId: String(id) }))).j.success).toBe(true);
		const msgs = (await jalan(pesan.GET, mk('GET', null, '', { ticketId: String(id) }))).j.data;
		expect(msgs.map((m) => [m.senderType, m.message])).toEqual([['customer', 'Belum sampai 3 hari'], ['agent', 'Kami cek ke kurir ya']]);
		expect((await jalan(detail.PUT, mk('PUT', { status: 'resolved' }, '', { ticketId: String(id) }))).j.success).toBe(true);
		[row] = await db.select().from(s.supportTickets).where(eq(s.supportTickets.id, id));
		expect(row.status).toBe('RESOLVED');
		expect(row.resolvedAt).toBeTruthy();

		// user lain tidak bisa membaca / membalas / mengubah
		login.userId = b.insertId;
		expect((await jalan(pesan.GET, mk('GET', null, '', { ticketId: String(id) }))).st).toBe(404);
		expect((await jalan(reply.POST, mk('POST', { message: 'x' }, '', { ticketId: String(id) }))).st).toBe(404);
		expect((await jalan(detail.PUT, mk('PUT', { status: 'CLOSED' }, '', { ticketId: String(id) }))).st).toBe(404);
	});
});
