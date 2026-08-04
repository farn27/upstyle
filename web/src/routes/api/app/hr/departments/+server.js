import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { departments, employees, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET: Fetch all departments for unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const deptList = await db.select()
            .from(departments)
            .where(eq(departments.unitId, Number(unitId)))
            .orderBy(departments.name);

        // Get employee count for each department
        const departmentsWithCount = await Promise.all(
            deptList.map(async (dept) => {
                const [countResult] = await db.select({ count: sql`count(*)` })
                    .from(employees)
                    .where(and(
                        eq(employees.companyId, Number(unitId)),
                        eq(employees.division, dept.name)
                    ));

                return {
                    id: dept.id,
                    unitId: dept.unitId,
                    name: dept.name,
                    employeeCount: Number(countResult?.count || 0)
                };
            })
        );

        return json({ 
            success: true, 
            departments: departmentsWithCount 
        });

    } catch (err) {
        log.api.error({ err }, 'GET hr/departments error');
        return json({ success: false, message: 'Gagal mengambil data departemen' }, { status: 500 });
    }
}

// POST: Create new department
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        const schema = z.object({
            unitId: z.coerce.number().int().positive(),
            name: z.string().min(1, 'Nama departemen wajib diisi').max(100)
        });

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
            return json({ success: false, message: msg }, { status: 400 });
        }

        const { unitId, name } = body;

        // Check if department already exists
        const existing = await db.select()
            .from(departments)
            .where(and(
                eq(departments.unitId, Number(unitId)),
                eq(departments.name, name.trim())
            ))
            .limit(1);

        if (existing.length > 0) {
            return json({ success: false, message: 'Departemen sudah ada' }, { status: 400 });
        }

        const [result] = await db.insert(departments).values({
            unitId: Number(unitId),
            name: name.trim()
        });

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId),
            pesan: `Departemen baru dibuat: ${name}`,
            kategori: 'HR',
            tipe: 'success'
        });

        return json({ 
            success: true, 
            message: 'Departemen berhasil dibuat',
            department: {
                id: result.insertId,
                unitId: Number(unitId),
                name: name.trim(),
                employeeCount: 0
            }
        });

    } catch (err) {
        log.api.error({ err }, 'POST hr/departments error');
        return json({ success: false, message: 'Gagal membuat departemen: ' + err.message }, { status: 500 });
    }
}

// PUT: Update department
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { departmentId, name, unitId } = body;

        if (!departmentId || !name) {
            return json({ success: false, message: 'departmentId dan name wajib diisi' }, { status: 400 });
        }

        const dept = await db.select()
            .from(departments)
            .where(eq(departments.id, Number(departmentId)))
            .limit(1);

        if (!dept || dept.length === 0) {
            return json({ success: false, message: 'Departemen tidak ditemukan' }, { status: 404 });
        }

        await db.update(departments)
            .set({ name: name.trim() })
            .where(eq(departments.id, Number(departmentId)));

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId || dept[0].unitId),
            pesan: `Departemen diperbarui: ${name}`,
            kategori: 'HR',
            tipe: 'info'
        });

        return json({ success: true, message: 'Departemen berhasil diperbarui' });

    } catch (err) {
        log.api.error({ err }, 'PUT hr/departments error');
        return json({ success: false, message: 'Gagal memperbarui departemen' }, { status: 500 });
    }
}

// DELETE: Delete department
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const departmentId = url.searchParams.get('departmentId');
    const unitId = url.searchParams.get('unitId');

    if (!departmentId) {
        return json({ success: false, message: 'departmentId wajib diisi' }, { status: 400 });
    }

    try {
        const dept = await db.select()
            .from(departments)
            .where(eq(departments.id, Number(departmentId)))
            .limit(1);

        if (!dept || dept.length === 0) {
            return json({ success: false, message: 'Departemen tidak ditemukan' }, { status: 404 });
        }

        // Check if department has employees
        const [empCount] = await db.select({ count: sql`count(*)` })
            .from(employees)
            .where(and(
                eq(employees.companyId, dept[0].unitId),
                eq(employees.division, dept[0].name)
            ));

        if (Number(empCount?.count || 0) > 0) {
            return json({ 
                success: false, 
                message: `Departemen tidak dapat dihapus karena masih memiliki ${empCount.count} karyawan` 
            }, { status: 400 });
        }

        await db.delete(departments)
            .where(eq(departments.id, Number(departmentId)));

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId || dept[0].unitId),
            pesan: `Departemen dihapus: ${dept[0].name}`,
            kategori: 'HR',
            tipe: 'warning'
        });

        return json({ success: true, message: 'Departemen berhasil dihapus' });

    } catch (err) {
        log.api.error({ err }, 'DELETE hr/departments error');
        return json({ success: false, message: 'Gagal menghapus departemen' }, { status: 500 });
    }
}
