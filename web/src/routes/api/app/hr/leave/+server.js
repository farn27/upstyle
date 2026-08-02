import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { leaveRequests, employees } from '$lib/server/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch leave requests (filtered by optional unitId or employeeId)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const employeeId = url.searchParams.get('employeeId');

    try {
        const conditions = [];

        if (employeeId) {
            conditions.push(eq(leaveRequests.employeeId, Number(employeeId)));
        }

        if (unitId) {
            const employeeList = await db.query.employees.findMany({
                where: eq(employees.companyId, Number(unitId))
            });
            const empIds = employeeList.map(e => e.id);
            if (empIds.length === 0) {
                return json({ success: true, message: "Berhasil mengambil data cuti", data: [] });
            }
            conditions.push(inArray(leaveRequests.employeeId, empIds));
        }

        const requests = await db.query.leaveRequests.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(leaveRequests.id)],
            with: {
                employee: true
            }
        });

        const mappedData = requests.map(r => ({
            id: r.id,
            employeeId: r.employeeId,
            employeeName: r.employee?.fullName || '',
            leaveType: r.type ? r.type.toUpperCase() : 'ANNUAL',
            startDate: r.startDate,
            endDate: r.endDate,
            reason: r.reason,
            status: r.status ? r.status.toUpperCase() : 'PENDING',
            approvedBy: r.approvedBy
        }));

        return json({
            success: true,
            message: "Berhasil mengambil data pengajuan cuti",
            data: mappedData
        });
    } catch (err) {
        log.hr.error({ err }, 'API GET LEAVE REQUESTS ERROR');
        return json({ success: false, message: "Gagal mengambil data pengajuan cuti" }, { status: 500 });
    }
}

// POST: Create leave request
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { employeeId, leaveType, startDate, endDate, reason } = body;

        if (!employeeId || !startDate || !endDate) {
            return json({ success: false, message: "employeeId, startDate, dan endDate wajib diisi" }, { status: 400 });
        }

        const typeVal = String(leaveType || 'ANNUAL').toLowerCase() === 'overtime' ? 'overtime' : 'leave';

        const [result] = await db.insert(leaveRequests).values({
            employeeId: Number(employeeId),
            type: typeVal,
            startDate: String(startDate),
            endDate: String(endDate),
            reason: reason || '',
            status: 'pending'
        });

        return json({
            success: true,
            message: "Pengajuan cuti berhasil dibuat",
            data: {
                id: result.insertId,
                employeeId: Number(employeeId),
                leaveType: leaveType || 'ANNUAL',
                startDate,
                endDate,
                reason,
                status: 'PENDING'
            }
        });
    } catch (err) {
        log.hr.error({ err }, 'API POST LEAVE REQUEST ERROR');
        return json({ success: false, message: "Gagal membuat pengajuan cuti" }, { status: 500 });
    }
}

// PUT: Approve or reject a leave request
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { leaveRequestId, status } = body;

        if (!leaveRequestId || !status) {
            return json({ success: false, message: "leaveRequestId dan status wajib diisi" }, { status: 400 });
        }

        const normStatus = String(status).toLowerCase();
        if (!['approved', 'rejected', 'pending'].includes(normStatus)) {
            return json({ success: false, message: "Status harus APPROVED, REJECTED, atau PENDING" }, { status: 400 });
        }

        await db.update(leaveRequests)
            .set({
                status: normStatus,
                approvedBy: Number(userId)
            })
            .where(eq(leaveRequests.id, Number(leaveRequestId)));

        return json({
            success: true,
            message: `Pengajuan cuti berhasil di-${normStatus === 'approved' ? 'setujui' : 'tolak'}`,
            data: {
                leaveRequestId: Number(leaveRequestId),
                status: normStatus.toUpperCase(),
                approvedBy: Number(userId)
            }
        });
    } catch (err) {
        log.hr.error({ err }, 'API PUT LEAVE REQUEST ERROR');
        return json({ success: false, message: "Gagal memproses pengajuan cuti" }, { status: 500 });
    }
}
