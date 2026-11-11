import { and, eq, gte, sql } from 'drizzle-orm';
import { attendance, employeeKpi, employees, leaveRequests, payrolls } from '$lib/server/schema';
import { thisMonthWIB, todayStrWIB } from '$lib/server/dateUtils';

/**
 * Ringkasan eksekutif HR satu unit: karyawan, beban gaji, kehadiran hari ini, cuti menunggu, kontrak, KPI, payroll bulan ini.
 * @param {any} db @param {number} unit
 */
export async function ringkasanHr(db, unit) {
	const hariIni = todayStrWIB();
	const { month: bln, year: thn } = thisMonthWIB();
	const [[agg], [hadir], [cuti], [kontrak], [kpiAvg], payrollAgg] = await Promise.all([
		db.select({
			total: sql`COUNT(*)`,
			aktif: sql`COALESCE(SUM(CASE WHEN COALESCE(${employees.status}, 'active') = 'active' THEN 1 ELSE 0 END), 0)`,
			beban: sql`COALESCE(SUM(CASE WHEN COALESCE(${employees.status}, 'active') = 'active' THEN ${employees.salary} ELSE 0 END), 0)`
		}).from(employees).where(eq(employees.companyId, unit)),
		db.select({ n: sql`COUNT(DISTINCT ${attendance.employeeId})` }).from(attendance)
			.innerJoin(employees, eq(employees.id, attendance.employeeId))
			.where(and(eq(employees.companyId, unit), gte(attendance.checkIn, `${hariIni} 00:00:00`))),
		db.select({ n: sql`COUNT(*)` }).from(leaveRequests)
			.innerJoin(employees, eq(employees.id, leaveRequests.employeeId))
			.where(and(eq(employees.companyId, unit), eq(leaveRequests.status, 'pending'))),
		db.select({
			segera: sql`COALESCE(SUM(CASE WHEN ${employees.contractEnd} >= ${hariIni} AND ${employees.contractEnd} <= DATE_ADD(${hariIni}, INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0)`,
			lewat: sql`COALESCE(SUM(CASE WHEN ${employees.contractEnd} < ${hariIni} THEN 1 ELSE 0 END), 0)`
		}).from(employees).where(and(eq(employees.companyId, unit), sql`${employees.contractEnd} IS NOT NULL`)),
		db.select({ rata: sql`AVG(CAST(${employeeKpi.score} AS DECIMAL(10,2)))` }).from(employeeKpi)
			.innerJoin(employees, eq(employees.id, employeeKpi.employeeId)).where(eq(employees.companyId, unit)),
		db.select({ status: payrolls.paymentStatus, n: sql`COUNT(*)`, net: sql`COALESCE(SUM(${payrolls.netSalary}), 0)` })
			.from(payrolls).innerJoin(employees, eq(employees.id, payrolls.employeeId))
			.where(and(eq(employees.companyId, unit), eq(payrolls.periodMonth, bln), eq(payrolls.periodYear, thn)))
			.groupBy(payrolls.paymentStatus)
	]);
	const bayar = (/** @type {string} */ st) => payrollAgg.find((/** @type {any} */ r) => r.status === st);
	return {
		totalKaryawan: Number(agg?.total || 0),
		karyawanAktif: Number(agg?.aktif || 0),
		bebanGaji: Number(agg?.beban || 0),
		hadirHariIni: Number(hadir?.n || 0),
		cutiMenunggu: Number(cuti?.n || 0),
		kontrakSegeraHabis: Number(kontrak?.segera || 0),
		kontrakLewat: Number(kontrak?.lewat || 0),
		kpiRataRata: kpiAvg?.rata == null ? null : Number(kpiAvg.rata),
		payrollBulanIni: {
			dibayar: Number(bayar('paid')?.n || 0), belumDibayar: Number(bayar('unpaid')?.n || 0),
			nominalDibayar: Number(bayar('paid')?.net || 0), nominalBelum: Number(bayar('unpaid')?.net || 0)
		},
		bulan: bln,
		tahun: thn
	};
}
