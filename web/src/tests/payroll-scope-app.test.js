/**
 * Riwayat payroll (app): hanya gaji karyawan unit yang diminta (dulu semua tenant ikut terkirim) dan filter bulan bekerja.
 * Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Payroll scope app', () => {
	it('riwayat gaji tidak bocor antar unit', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const api = await import('../routes/api/app/hr/payroll/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ya${t}`, email: `ya${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `yb${t}`, email: `yb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'PY A', slug: `py-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'PY B', slug: `py-b-${t}`, kategori: 'RETAIL_TOKO' });
		const [ea] = await db.insert(s.employees).values({ companyId: ua.insertId, userId: a.insertId, fullName: 'Karyawan A', slug: `kar-a-${t}`, position: 'Kasir', role: 'cashier', password: 'x', pin: 'x' });
		const [eb] = await db.insert(s.employees).values({ companyId: ub.insertId, userId: b.insertId, fullName: 'Karyawan B', slug: `kar-b-${t}`, position: 'Kasir', role: 'cashier', password: 'x', pin: 'x' });
		await db.insert(s.payrolls).values({ employeeId: ea.insertId, periodMonth: 10, periodYear: 2026, basicSalary: '3000000', netSalary: '3000000' });
		await db.insert(s.payrolls).values({ employeeId: ea.insertId, periodMonth: 11, periodYear: 2026, basicSalary: '3100000', netSalary: '3100000' });
		await db.insert(s.payrolls).values({ employeeId: eb.insertId, periodMonth: 11, periodYear: 2026, basicSalary: '9000000', netSalary: '9000000' });

		const req = (qs) => ({ request: new Request(`http://x/?${qs}`), cookies: { get() {} }, url: new URL(`http://x/?${qs}`) });
		login.userId = a.insertId;
		const semua = (await (await api.GET(req(`unitId=${ua.insertId}&type=history`))).json()).payrolls;
		expect(semua.map((p) => [p.employeeName, p.netSalary]).sort()).toEqual([['Karyawan A', 3000000], ['Karyawan A', 3100000]]);
		const nov = (await (await api.GET(req(`unitId=${ua.insertId}&type=history&monthYear=${encodeURIComponent('November 2026')}`))).json()).payrolls;
		expect(nov.map((p) => p.netSalary)).toEqual([3100000]);
	});
});
