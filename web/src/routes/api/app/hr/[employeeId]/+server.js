import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees, employeeDocuments, employeeHistory, employeeKpi, attendance, payrolls } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ params, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	const employeeId = Number(params.employeeId);
	if (!employeeId || isNaN(employeeId)) {
		return json({ success: false, message: "ID karyawan tidak valid" }, { status: 400 });
	}

	try {
		const employee = await db.query.employees.findFirst({
			where: eq(employees.id, employeeId)
		});

		if (!employee) {
			return json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
		}

		const documents = await db.query.employeeDocuments.findMany({
			where: eq(employeeDocuments.employeeId, employeeId),
			orderBy: [desc(employeeDocuments.id)]
		});

		const history = await db.query.employeeHistory.findMany({
			where: eq(employeeHistory.employeeId, employeeId),
			orderBy: [desc(employeeHistory.id)]
		});

		const kpi = await db.query.employeeKpi.findMany({
			where: eq(employeeKpi.employeeId, employeeId),
			orderBy: [desc(employeeKpi.id)]
		});

		const recentAttendance = await db.query.attendance.findMany({
			where: eq(attendance.employeeId, employeeId),
			orderBy: [desc(attendance.id)],
			limit: 30
		});

		const payrollHistory = await db.query.payrolls.findMany({
			where: eq(payrolls.employeeId, employeeId),
			orderBy: [desc(payrolls.id)]
		});

		return json({
			success: true,
			message: "Berhasil mengambil detail karyawan",
			data: {
				...employee,
				documents,
				history,
				kpi,
				attendance: recentAttendance,
				payrolls: payrollHistory
			}
		});
	} catch (err) {
		log.hr.error({ err }, 'API GET HR employee detail error');
		return json({ success: false, message: "Gagal mengambil data karyawan: " + err.message }, { status: 500 });
	}
}
