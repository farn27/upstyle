import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { leaveRequests, employees, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/hr/leave?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        // Get all employees in unit
        const empList = await db.query.employees.findMany({
            where: eq(employees.companyId, Number(unitId)),
            columns: { id: true, fullName: true }
        });
        const empIds = empList.map(e => e.id);
        const empMap = Object.fromEntries(empList.map(e => [e.id, e.fullName]));

        let requests = [];
        if (empIds.length > 0) {
            requests = await db.query.leaveRequests.findMany({
                where: inArray(leaveRequests.employeeId, empIds),
                orderBy: [desc(leaveRequests.id)]
            });
        }

        const data = requests.map(r => ({
            id: r.id, employeeId: r.employeeId,
            employeeName: empMap[r.employeeId] || `Karyawan #${r.employeeId}`,
            type: r.type, startDate: r.startDate || '', endDate: r.endDate || '',
            reason: r.reason || '', status: r.status
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET hr/leave');
        return json({ success: false, message: 'Gagal memuat data izin' }, { status: 500 });
    }
}

// POST /api/app/hr/leave — ajukan izin/lembur
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        employeeId: z.coerce.number().int().positive(),
        type: z.enum(['leave','overtime']),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        reason: z.string().optional().default(''),
        unitId: z.coerce.number().int().positive()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.leaveRequest || body);
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });
        const { employeeId, type, startDate, endDate, reason, unitId } = parsed.data;

        const [result] = await db.insert(leaveRequests).values({
            employeeId, type,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            reason, status: 'pending'
        });

        const emp = await db.query.employees.findFirst({ where: eq(employees.id, employeeId), columns: { fullName: true } });
        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Pengajuan ${type === 'leave' ? 'Cuti' : 'Lembur'} dari ${emp?.fullName || `Karyawan #${employeeId}`}`,
            kategori: 'HR', tipe: 'info'
        });

        return json({ success: true, message: 'Pengajuan berhasil dikirim', data: { id: result.insertId } });
    } catch (err) {
        log.api.error({ err }, 'POST hr/leave');
        return json({ success: false, message: 'Gagal kirim pengajuan' }, { status: 500 });
    }
}

// PUT /api/app/hr/leave — approve/reject izin
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { leaveId, status } = body;
        if (!leaveId || !status) return json({ success: false, message: 'leaveId dan status wajib' }, { status: 400 });

        await db.update(leaveRequests)
            .set({ status, approvedBy: status !== 'pending' ? userId : null })
            .where(eq(leaveRequests.id, Number(leaveId)));

        return json({ success: true, message: `Izin ${status === 'approved' ? 'disetujui' : 'ditolak'}` });
    } catch (err) {
        log.api.error({ err }, 'PUT hr/leave');
        return json({ success: false, message: 'Gagal update izin' }, { status: 500 });
    }
}
