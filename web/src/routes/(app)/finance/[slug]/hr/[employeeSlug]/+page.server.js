import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and, desc, sql, asc, ne } from 'drizzle-orm';

function toSnakeCase(obj) {
    if (!obj) return obj;
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
        const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        res[snake] = v;
    }
    if (res.join_date && !res.joined_at) res.joined_at = res.join_date;
    return res;
}

import { error } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ params, cookies }) {
    const { employeeSlug, slug } = params;
    const userId = await getCurrentUserId(cookies);

    if (!userId) {
        throw error(401, 'Silakan login terlebih dahulu');
    }

    try {
        const rows = await db.select({
            employees: schema.employees
        })
        .from(schema.employees)
        .innerJoin(schema.unitBisnis, eq(schema.unitBisnis.id, schema.employees.companyId))
        .where(and(
            eq(schema.employees.slug, employeeSlug),
            eq(schema.unitBisnis.slug, slug),
            eq(schema.unitBisnis.userId, userId)
        ))
        .limit(1);

        const employeesResult = rows.map(r => toSnakeCase(r.employees));

        if (employeesResult.length === 0) {
            throw error(404, 'Karyawan tidak ditemukan');
        }

        const employeeData = employeesResult[0] ?? {};
        const employeeId = Number(employeeData.id);
        const companyId = Number(employeeData.company_id);

        const componentsRaw = await db.select()
            .from(schema.salaryComponents)
            .where(eq(schema.salaryComponents.employeeId, employeeId))
            .orderBy(asc(schema.salaryComponents.type));
        const components = componentsRaw.map(toSnakeCase);

        const managersRaw = await db.select({
            id: schema.employees.id,
            full_name: schema.employees.fullName,
            position: schema.employees.position
        })
        .from(schema.employees)
        .where(and(
            eq(schema.employees.companyId, companyId),
            ne(schema.employees.id, employeeId)
        ))
        .orderBy(asc(schema.employees.fullName));
        const managers = managersRaw;

        const kpiRows = await db.select({ score: schema.employeeKpi.score })
            .from(schema.employeeKpi)
            .where(eq(schema.employeeKpi.employeeId, employeeId))
            .orderBy(desc(schema.employeeKpi.createdAt))
            .limit(1);

        const kpiResult = /** @type {Array<Record<string, any>>} */ (Array.isArray(kpiRows) ? kpiRows : []);

        return {
            employee: employeeData,
            salaryComponents: /** @type {Array<Record<string, any>>} */ (components),
            kpiScore: kpiResult[0]?.score ?? 0,
            managers: /** @type {Array<Record<string, any>>} */ (managers)
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('SQL Error di Detail Karyawan:', message);
        throw error(500, 'Gagal memuat data karyawan: ' + message);
    }
}
