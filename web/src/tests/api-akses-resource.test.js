/**
 * Tes celah akses: user A mencoba membaca / mengubah data milik user B lewat ID resource
 * (tanpa unitId). Semua harus ditolak 404 dan data B tidak berubah.
 * Hanya jalan kalau TEST_DATABASE_URL diset (database khusus tes).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));

describe.skipIf(!TEST_DB)('Akses resource milik user lain ditolak', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		r.contact = await import('../routes/api/app/crm/contacts/[contactId]/+server.js');
		r.employee = await import('../routes/api/app/hr/[employeeId]/+server.js');
		r.hr = await import('../routes/api/app/hr/+server.js');
		r.pricing = await import('../routes/api/app/products/pricing/+server.js');
		r.coa = await import('../routes/api/app/finance/coa/+server.js');
		r.notif = await import('../routes/api/app/notifications/[notifId]/read/+server.js');
		r.tasks = await import('../routes/api/app/crm/tasks/+server.js');

		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ra${t}`, email: `ra${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `rb${t}`, email: `rb${t}@contoh.id` });
		id.userA = a.insertId; id.userB = b.insertId;
		const [ua] = await db.insert(s.unitBisnis).values({ userId: id.userA, namaUnit: 'A', slug: `ra-${t}`, modalAwal: '0' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: id.userB, namaUnit: 'B', slug: `rb-${t}`, modalAwal: '0' });
		id.unitA = ua.insertId; id.unitB = ub.insertId;

		// Data milik B
		const [c] = await db.insert(s.crmContacts).values({ ownerId: id.userB, unitId: id.unitB, nama: 'Kontak B' });
		id.contactB = c.insertId;
		const [e] = await db.insert(s.employees).values({ companyId: id.unitB, fullName: 'Karyawan B', position: 'Kasir', salary: '3000000', status: 'active' });
		id.empB = e.insertId;
		id.prodB = `PRD-RB-${t}`;
		await db.insert(s.products).values({ id: id.prodB, slug: `p-rb-${t}`, nama: 'Produk B', userId: id.userB, unitId: id.unitB, hargaBeli: '1000', hargaJual: '2000', stok: 1 });
		const [k] = await db.insert(s.chartOfAccounts).values({ unitId: id.unitB, kodeAkun: '1-1', namaAkun: 'Kas B', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' });
		id.coaB = k.insertId;
		const [n] = await db.insert(s.riwayatAksi).values({ userId: id.userB, unitId: id.unitB, pesan: 'notif B', tipe: 'info' });
		id.notifB = n.insertId;
		const [tk] = await db.insert(s.crmTasks).values({ ownerId: id.userB, unitId: id.unitB, deskripsi: 'Task B', status: 'pending' });
		id.taskB = tk.insertId;

		// Data milik A (kontrol: harus tetap bisa)
		const [ca] = await db.insert(s.crmContacts).values({ ownerId: id.userA, unitId: id.unitA, nama: 'Kontak A' });
		id.contactA = ca.insertId;
	});

	afterAll(async () => {
		for (const u of [id.unitA, id.unitB]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		if (id.empB) await db.delete(s.employees).where(eq(s.employees.id, id.empB));
		for (const u of [id.userA, id.userB]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	const cookies = { get: () => undefined };
	/** @param {string} method @param {any} [body] */
	const req = (method, body) => new Request('http://x', body === undefined ? { method } : { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

	it('kontak CRM: baca / ubah / hapus milik B → 404', async () => {
		login.userId = id.userA;
		const params = { contactId: String(id.contactB) };
		expect((await r.contact.GET({ params, cookies, request: req('GET') })).status).toBe(404);
		expect((await r.contact.PUT({ params, cookies, request: req('PUT', { nama: 'DIBAJAK' }) })).status).toBe(404);
		expect((await r.contact.DELETE({ params, cookies, request: req('DELETE') })).status).toBe(404);
		const c = await db.query.crmContacts.findFirst({ where: eq(s.crmContacts.id, id.contactB) });
		expect(c.nama).toBe('Kontak B');
	});

	it('kontak CRM milik sendiri tetap bisa diubah', async () => {
		login.userId = id.userA;
		const res = await r.contact.PUT({ params: { contactId: String(id.contactA) }, cookies, request: req('PUT', { nama: 'Kontak A2' }) });
		expect(res.status).toBe(200);
	});

	it('hapus kontak CRM sendiri berhasil (riwayat_aksi tidak lagi pakai tipe "warning" yang ditolak DB)', async () => {
		login.userId = id.userA;
		const [c] = await db.insert(s.crmContacts).values({ ownerId: id.userA, unitId: id.unitA, nama: 'Kontak dihapus' });
		const res = await r.contact.DELETE({ params: { contactId: String(c.insertId) }, cookies, request: req('DELETE') });
		expect(res.status).toBe(200);
		expect(await db.query.crmContacts.findFirst({ where: eq(s.crmContacts.id, c.insertId) })).toBeUndefined();
	});

	it('karyawan: detail & ubah gaji milik B → 404', async () => {
		login.userId = id.userA;
		const params = { employeeId: String(id.empB) };
		expect((await r.employee.GET({ params, cookies, request: req('GET') })).status).toBe(404);
		expect((await r.employee.PUT({ params, cookies, request: req('PUT', { salary: 1 }) })).status).toBe(404);
		const url = new URL(`http://x?employeeId=${id.empB}`);
		expect((await r.hr.PUT({ url, cookies, request: req('PUT', { salary: 1 }) })).status).toBe(404);
		const emp = await db.query.employees.findFirst({ where: eq(s.employees.id, id.empB) });
		expect(Number(emp.salary)).toBe(3000000);
	});

	it('absen atas nama karyawan B → 404', async () => {
		login.userId = id.userA;
		const res = await r.hr.POST({ cookies, request: req('POST', { action: 'check-in', employeeId: id.empB, unitId: id.unitA, date: '2026-11-05', time: '08:00' }) });
		expect(res.status).toBe(404);
	});

	it('harga produk B (satuan & massal) → 404, harga tidak berubah', async () => {
		login.userId = id.userA;
		expect((await r.pricing.PUT({ cookies, request: req('PUT', { id: id.prodB, hargaJual: 1 }) })).status).toBe(404);
		expect((await r.pricing.PUT({ cookies, request: req('PUT', { items: [{ id: id.prodB, hargaJual: 1 }] }) })).status).toBe(404);
		const p = await db.query.products.findFirst({ where: eq(s.products.id, id.prodB) });
		expect(Number(p.hargaJual)).toBe(2000);
	});

	it('COA B: ubah / nonaktifkan → 404', async () => {
		login.userId = id.userA;
		expect((await r.coa.PUT({ cookies, request: req('PUT', { id: id.coaB, namaAkun: 'X' }) })).status).toBe(404);
		expect((await r.coa.DELETE({ url: new URL(`http://x?coaId=${id.coaB}`), cookies, request: req('DELETE') })).status).toBe(404);
		const k = await db.query.chartOfAccounts.findFirst({ where: eq(s.chartOfAccounts.id, id.coaB) });
		expect(k.namaAkun).toBe('Kas B');
		expect(k.isActive).toBe(1);
	});

	it('notifikasi & task CRM B → 404', async () => {
		login.userId = id.userA;
		expect((await r.notif.PUT({ params: { notifId: String(id.notifB) }, cookies, request: req('PUT') })).status).toBe(404);
		expect((await r.tasks.PUT({ cookies, request: req('PUT', { taskId: id.taskB, status: 'done' }) })).status).toBe(404);
		const tk = await db.query.crmTasks.findFirst({ where: eq(s.crmTasks.id, id.taskB) });
		expect(tk.status).toBe('pending');
	});
});
