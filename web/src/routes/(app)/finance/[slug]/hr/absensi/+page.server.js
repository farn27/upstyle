import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and, desc, sql, isNull, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { todayStrWIB } from '$lib/server/dateUtils';

export async function load({ params, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');

	const units = await db.select({ id: schema.unitBisnis.id, nama_unit: schema.unitBisnis.namaUnit, slug: schema.unitBisnis.slug })
		.from(schema.unitBisnis)
		.where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));
	if (!units.length) throw error(404, 'Unit tidak ditemukan');
	const unit = units[0];

	const employeesRaw = await db.select({ id: schema.employees.id, full_name: schema.employees.fullName, position: schema.employees.position, role: schema.employees.role })
		.from(schema.employees)
		.where(and(eq(schema.employees.companyId, unit.id), eq(schema.employees.status, 'active')))
		.orderBy(asc(schema.employees.fullName));
	const employees = employeesRaw;

	const attendanceRaw = await db.select({ ...schema.attendance, full_name: schema.employees.fullName })
		.from(schema.attendance)
		.innerJoin(schema.employees, eq(schema.employees.id, schema.attendance.employeeId))
		.where(eq(schema.employees.companyId, unit.id))
		.orderBy(desc(schema.attendance.checkIn))
		.limit(50);
	
	const attendance = attendanceRaw.map(a => {
		const snake = {};
		for (const [k, v] of Object.entries(a)) {
			snake[k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = v;
		}
		return snake;
	});

	return { unit, employees, attendance, today: todayStrWIB() };
}

export const actions = {
	checkIn: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Sesi berakhir' });

		const formData = await request.formData();
		const employeeId = Number(formData.get('employee_id'));

		const units = await db.select({ id: schema.unitBisnis.id }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));
		if (!units.length) return fail(404, { message: 'Unit tidak ditemukan' });

		const emp = await db.select({ id: schema.employees.id }).from(schema.employees).where(and(eq(schema.employees.id, employeeId), eq(schema.employees.companyId, units[0].id)));
		if (!emp.length) return fail(400, { message: 'Karyawan tidak valid' });

		const open = await db.select({ id: schema.attendance.id })
			.from(schema.attendance)
			.where(and(eq(schema.attendance.employeeId, employeeId), isNull(schema.attendance.checkOut)))
			.orderBy(desc(schema.attendance.checkIn))
			.limit(1);

		if (open.length) {
			await db.update(schema.attendance).set({ checkOut: sql`NOW()`, status: 'present' }).where(eq(schema.attendance.id, open[0].id));
			return { success: true, message: 'Check-out berhasil dicatat.' };
		}

		await db.insert(schema.attendance).values({ employeeId, checkIn: sql`NOW()`, status: 'present' });
		return { success: true, message: 'Check-in berhasil dicatat.' };
	}
};
