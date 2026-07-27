/**
 * GET /api/slip-gaji/[employeeId]?month=X&year=Y
 * Generate slip gaji HTML untuk karyawan tertentu
 */
import { db } from '$lib/server/drizzle';
import { employees, unitBisnis, payrolls, salaryComponents } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { generateSlipGajiHTML } from '$lib/server/payrollCalculator';
import { apiUnauthorized, apiError } from '$lib/server/apiResponse';
import { thisMonthWIB } from '$lib/server/dateUtils';

export async function GET({ params, url, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	const { employeeId } = params;
	const { month: wibMonth, year: wibYear } = thisMonthWIB();
	const month = parseInt(url.searchParams.get('month') || wibMonth);
	const year = parseInt(url.searchParams.get('year') || wibYear);
	const ptkpCode = url.searchParams.get('ptkp') || 'TK0';

	try {
		// Ambil data karyawan + unit bisnis (verifikasi ownership)
		const empRaw = await db.select({
			employee: employees,
			unit: unitBisnis
		})
		.from(employees)
		.innerJoin(unitBisnis, eq(unitBisnis.id, employees.companyId))
		.where(and(eq(employees.id, Number(employeeId)), eq(unitBisnis.userId, userId)))
		.limit(1);

		if (!empRaw.length) return apiError('Karyawan tidak ditemukan', 404);
		
		const employee = {
			...empRaw[0].employee,
			nama_unit: empRaw[0].unit.namaUnit,
			alamat: empRaw[0].unit.alamat,
			telepon: empRaw[0].unit.telepon,
			email: empRaw[0].unit.email
		};

		// Ambil data payroll bulan ini
		const payrollRows = await db.select()
			.from(payrolls)
			.where(and(
				eq(payrolls.employeeId, Number(employeeId)), 
				eq(payrolls.periodMonth, month), 
				eq(payrolls.periodYear, year)
			))
			.limit(1);

		// Ambil salary components
		const components = await db.select({ name: salaryComponents.name, amount: salaryComponents.amount, type: salaryComponents.type })
			.from(salaryComponents)
			.where(eq(salaryComponents.employeeId, Number(employeeId)));

		const payroll = payrollRows[0] || null;
		const basicSalary = payroll
			? Number(payroll.basic_salary)
			: Number(employee.salary || 0);

		const html = generateSlipGajiHTML({
			employee,
			unit: {
				namaUnit: employee.nama_unit,
				alamat: employee.alamat,
				telepon: employee.telepon,
				email: employee.email
			},
			periodMonth: month,
			periodYear: year,
			basicSalary,
			components,
			ptkpCode
		});

		return new Response(html, {
			headers: { 'Content-Type': 'text/html; charset=utf-8' }
		});
	} catch (err) {
		console.error('[SlipGaji] Error:', err);
		return apiError('Gagal generate slip gaji: ' + err.message, 500);
	}
}
