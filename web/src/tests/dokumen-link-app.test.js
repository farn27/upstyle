/**
 * Link dokumen sementara: slip gaji & invoice dibuka dari browser HP lewat token bertanda tangan 10 menit,
 * terikat pemilik; token rusak/kedaluwarsa ditolak. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Dokumen link', () => {
	it('slip gaji lewat link sementara', async () => {
		process.env.ENCRYPTION_KEY ||= 'a'.repeat(64);
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const buat = await import('../routes/api/app/dokumen/+server.js');
		const buka = await import('../routes/api/dokumen/+server.js');
		const { signState } = await import('../lib/server/crypto.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `da${t}`, email: `da${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `db${t}`, email: `db${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'DK A', slug: `dk-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ea] = await db.insert(s.employees).values({ companyId: ua.insertId, userId: a.insertId, fullName: 'Siti Aminah', slug: `siti-${t}`, position: 'Kasir', role: 'cashier', password: 'x', pin: 'x', salary: '3000000' });
		await db.insert(s.payrolls).values({ employeeId: ea.insertId, periodMonth: 11, periodYear: 2026, basicSalary: '3000000', netSalary: '3000000' });

		const req = (body) => ({ request: new Request('http://x/', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), cookies: { get() {} }, url: new URL('http://x/') });
		login.userId = a.insertId;
		expect((await buat.POST(req({ jenis: 'ijazah', id: 1 }))).status).toBe(422);
		const r = await (await buat.POST(req({ jenis: 'slip', id: ea.insertId, month: 11, year: 2026 }))).json();
		expect(r.success).toBe(true);
		const link = new URL(r.data.url);
		// dibuka TANPA login (browser HP)
		login.userId = null;
		const hasil = await buka.GET({ url: link, cookies: { get() {} }, request: new Request(link) });
		expect(hasil.status).toBe(200);
		expect(await hasil.text()).toContain('Siti Aminah');

		// token karyawan milik user lain → ditolak oleh pengecekan kepemilikan di handler asli
		const tokenCuri = signState({ u: b.insertId, j: 'slip', i: String(ea.insertId), m: 11, y: 2026, t: 'pos', x: Date.now() + 60000 });
		const u2 = new URL(`http://x/api/dokumen?token=${encodeURIComponent(tokenCuri)}`);
		expect((await buka.GET({ url: u2, cookies: { get() {} }, request: new Request(u2) })).status).toBe(404);
		// kedaluwarsa & rusak
		const lama = signState({ u: a.insertId, j: 'slip', i: String(ea.insertId), x: Date.now() - 1 });
		const u3 = new URL(`http://x/api/dokumen?token=${encodeURIComponent(lama)}`);
		expect((await buka.GET({ url: u3, cookies: { get() {} }, request: new Request(u3) })).status).toBe(410);
		const u4 = new URL('http://x/api/dokumen?token=ngawur');
		expect((await buka.GET({ url: u4, cookies: { get() {} }, request: new Request(u4) })).status).toBe(410);
	});
});
