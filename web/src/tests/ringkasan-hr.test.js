/**
 * Ringkasan eksekutif HR (kartu di halaman HR app). Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
vi.mock('$env/dynamic/private', () => ({ env: process.env }));

describe.skipIf(!TEST_DB)('Ringkasan HR', () => {
	it('menghitung karyawan aktif, beban gaji, kehadiran hari ini, cuti, kontrak, payroll bulan ini', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { ringkasanHr } = await import('../lib/server/ringkasanHr.js');
		const { todayStrWIB, thisMonthWIB } = await import('../lib/server/dateUtils.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `hr${t}`, email: `hr${t}@x.id`, role: 'free' });
		const [unit] = await db.insert(s.unitBisnis).values({ userId: u.insertId, namaUnit: 'HR Uji', slug: `hr-${t}`, modalAwal: '0', kategori: 'RETAIL' });
		const [unit2] = await db.insert(s.unitBisnis).values({ userId: u.insertId, namaUnit: 'HR Lain', slug: `hr2-${t}`, modalAwal: '0', kategori: 'RETAIL' });
		const hari = todayStrWIB();
		const plus = (n) => new Date(Date.parse(hari) + n * 86400e3).toISOString().slice(0, 10);
		const mk = async (nama, gaji, extra = {}) => (await db.insert(s.employees).values({ companyId: unit.insertId, fullName: nama, position: 'Staf', salary: String(gaji), status: 'active', ...extra }))[0].insertId;
		const a = await mk('Aktif A', 3000000, { contractEnd: plus(10) });
		const b = await mk('Aktif B', 2000000, { contractEnd: plus(-5) });
		await mk('Nonaktif', 9000000, { status: 'inactive' });
		await db.insert(s.employees).values({ companyId: unit2.insertId, fullName: 'Unit lain', position: 'X', salary: '5000000', status: 'active' });
		await db.insert(s.attendance).values({ employeeId: a, checkIn: `${hari} 08:00:00`, status: 'present' });
		await db.insert(s.attendance).values({ employeeId: a, checkIn: `${hari} 12:00:00`, status: 'present' }); // karyawan sama → dihitung sekali
		await db.insert(s.attendance).values({ employeeId: b, checkIn: `${plus(-3)} 08:00:00`, status: 'present' }); // bukan hari ini
		await db.insert(s.leaveRequests).values({ employeeId: b, type: 'leave', startDate: hari, endDate: hari, status: 'pending' });
		const { month, year } = thisMonthWIB();
		await db.insert(s.payrolls).values({ employeeId: a, periodMonth: month, periodYear: year, basicSalary: '3000000', allowances: '0', deductions: '0', netSalary: '3000000', paymentStatus: 'paid' });
		await db.insert(s.payrolls).values({ employeeId: b, periodMonth: month, periodYear: year, basicSalary: '2000000', allowances: '0', deductions: '0', netSalary: '2000000', paymentStatus: 'unpaid' });

		const r = await ringkasanHr(db, unit.insertId);
		expect(r).toMatchObject({
			totalKaryawan: 3, karyawanAktif: 2, bebanGaji: 5000000, hadirHariIni: 1, cutiMenunggu: 1,
			kontrakSegeraHabis: 1, kontrakLewat: 1
		});
		expect(r.payrollBulanIni).toEqual({ dibayar: 1, belumDibayar: 1, nominalDibayar: 3000000, nominalBelum: 2000000 });
	});
});
