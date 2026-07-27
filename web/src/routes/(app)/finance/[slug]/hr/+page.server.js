import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and, desc, sql, asc, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';

function toSnakeCase(obj) {
    if (!obj) return obj;
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
        const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        res[snake] = v;
    }
    if (res.join_date && !res.joined_at) res.joined_at = res.join_date;
    if (res.employee_id_card && !res.id_number) res.id_number = res.employee_id_card;
    return res;
}


export async function load({ params, cookies }) {
    const userId = await getCurrentUserId(cookies);

    if (!userId) {
        throw error(401, 'Silakan login terlebih dahulu');
    }

    const units = await db.select().from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));

    if (units.length === 0) {
        throw error(404, 'Unit Bisnis tidak ditemukan atau Anda tidak memiliki akses.');
    }

    const unit = units[0];
    const rawEmployees = await db.select().from(schema.employees).where(eq(schema.employees.companyId, unit.id)).orderBy(desc(schema.employees.id));
    const employees = rawEmployees.map(toSnakeCase);

    const totalBebanGaji = employees.reduce((acc, emp) => acc + (Number(emp.salary) || 0), 0);
    const { month: currentMonth, year: currentYear } = thisMonthWIB();

    const attendanceRows = await db.select({ cnt: sql`COUNT(*)` }).from(schema.attendance).innerJoin(schema.employees, eq(schema.employees.id, schema.attendance.employeeId)).where(eq(schema.employees.companyId, unit.id));

    const pendingRequests = await db.select({
        ...schema.leaveRequests,
        full_name: schema.employees.fullName
    }).from(schema.leaveRequests).innerJoin(schema.employees, eq(schema.employees.id, schema.leaveRequests.employeeId)).where(and(eq(schema.employees.companyId, unit.id), eq(schema.leaveRequests.status, 'pending'))).orderBy(desc(schema.leaveRequests.id)).limit(6);

    const leaveSummaryRows = await db.select({
        type: sql`COALESCE(${schema.leaveRequests.type}, 'leave')`,
        cnt: sql`COUNT(*)`
    }).from(schema.leaveRequests).innerJoin(schema.employees, eq(schema.employees.id, schema.leaveRequests.employeeId)).where(eq(schema.employees.companyId, unit.id)).groupBy(schema.leaveRequests.type);

    const lifecycleRows = await db.select({
        status: sql`COALESCE(${schema.employees.status}, 'active')`,
        cnt: sql`COUNT(*)`
    }).from(schema.employees).where(eq(schema.employees.companyId, unit.id)).groupBy(schema.employees.status);

    const contractExpiringRows = await db.select({
        id: schema.employees.id,
        full_name: schema.employees.fullName,
        position: schema.employees.position,
        contract_end: schema.employees.contractEnd
    }).from(schema.employees).where(and(eq(schema.employees.companyId, unit.id), sql`NULLIF(CAST(${schema.employees.contractEnd} AS CHAR), '') IS NOT NULL`)).orderBy(asc(schema.employees.contractEnd)).limit(6);

    const payrollRows = await db.select({
        ...schema.payrolls,
        full_name: schema.employees.fullName
    }).from(schema.payrolls).innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId)).where(and(eq(schema.employees.companyId, unit.id), eq(schema.payrolls.periodMonth, currentMonth), eq(schema.payrolls.periodYear, currentYear))).orderBy(desc(schema.payrolls.id)).limit(8);

    const kpiRows = await db.select({
        avg_score: sql`AVG(CAST(${schema.employeeKpi.score} AS DECIMAL(10,2)))`
    }).from(schema.employeeKpi).innerJoin(schema.employees, eq(schema.employees.id, schema.employeeKpi.employeeId)).where(eq(schema.employees.companyId, unit.id));

    const shiftRows = await db.select().from(schema.shifts).where(eq(schema.shifts.companyId, unit.id)).orderBy(desc(schema.shifts.id)).limit(4);

    const activityRows = await db.select({
        pesan: sql`COALESCE(${schema.riwayatAksi.pesan}, 'Aktivitas HR terbaru')`,
        kategori: sql`COALESCE(${schema.riwayatAksi.kategori}, 'HR')`,
        tipe: sql`COALESCE(${schema.riwayatAksi.tipe}, 'info')`,
        waktu: schema.riwayatAksi.waktu
    }).from(schema.riwayatAksi).where(and(eq(schema.riwayatAksi.unitId, unit.id), eq(schema.riwayatAksi.kategori, 'HR'))).orderBy(desc(schema.riwayatAksi.id)).limit(6);

    const approvalRows = await db.select({
        ...schema.approvalRequests,
        full_name: schema.employees.fullName
    }).from(schema.approvalRequests).leftJoin(schema.employees, eq(schema.employees.id, schema.approvalRequests.requesterId)).where(and(eq(schema.approvalRequests.unitId, unit.id), sql`${schema.approvalRequests.module} IN ('reimbursement', 'loan')`)).orderBy(desc(schema.approvalRequests.id)).limit(8);

    const analyticsRows = await db.select({
        period_month: schema.payrolls.periodMonth,
        total_payroll: sql`SUM(COALESCE(${schema.payrolls.netSalary}, 0))`
    }).from(schema.payrolls).innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId)).where(eq(schema.employees.companyId, unit.id)).groupBy(schema.payrolls.periodMonth).orderBy(desc(schema.payrolls.periodMonth)).limit(6);

    const payrollSummaryRows = await db.select({
        payment_status: schema.payrolls.paymentStatus,
        cnt: sql`COUNT(*)`,
        total: sql`SUM(COALESCE(${schema.payrolls.netSalary}, 0))`
    }).from(schema.payrolls).innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId)).where(and(eq(schema.employees.companyId, unit.id), eq(schema.payrolls.periodMonth, currentMonth), eq(schema.payrolls.periodYear, currentYear))).groupBy(schema.payrolls.paymentStatus);

    return {
        unit,
        employees,
        totalBebanGaji,
        attendanceCount: attendanceRows[0]?.cnt || 0,
        pendingRequests,
        payrollRuns: payrollRows,
        avgKpi: Number(kpiRows[0]?.avg_score || 0),
        leaveSummary: leaveSummaryRows,
        lifecycleSummary: lifecycleRows,
        contractExpiring: contractExpiringRows,
        activityFeed: activityRows,
        shifts: shiftRows,
        approvalRequests: approvalRows,
        analyticsRows,
        payrollSummary: payrollSummaryRows,
        portalLink: unit.login_slug ? `/portal/${unit.login_slug}` : `/finance/${params.slug}/settings`
    };
}

export async function actions({ request, params, cookies }) {
    const userId = await getCurrentUserId(cookies);
    if (!userId) {
        return { success: false, message: 'Silakan login ulang.' };
    }

    const units = await db.select({ id: schema.unitBisnis.id }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));
    if (units.length === 0) {
        return { success: false, message: 'Unit tidak ditemukan.' };
    }

    const unitId = units[0].id;
    const body = await request.json();

    if (body.action === 'create-request') {
        const req = body.request || {};
        await db.insert(schema.leaveRequests).values({
            employeeId: req.employeeId,
            type: req.type || 'leave',
            startDate: req.startDate,
            endDate: req.endDate,
            reason: req.reason || '',
            status: 'pending'
        });
        return { success: true, message: 'Permintaan cuti/lembur berhasil dikirim.' };
    }

    if (body.action === 'create-approval') {
        const approval = body.approval || {};
        const moduleName = approval.module || 'reimbursement';
        const requesterId = approval.requesterId || null;
        const amount = Number(approval.amount || 0);
        const note = approval.note || '';

        await db.insert(schema.approvalRequests).values({
            module: moduleName,
            requesterId,
            unitId,
            actionType: 'CREATE',
            currentLevel: 1,
            maxLevel: 1,
            status: 'PENDING',
            note,
            dataAfter: { amount, module: moduleName }
        });

        return { success: true, message: `${moduleName === 'loan' ? 'Pinjaman' : 'Reimbursement'} berhasil diajukan.` };
    }

    if (body.action === 'decide-approval') {
        const approvalId = Number(body.approval_id);
        const decision = String(body.decision || '').toLowerCase();

        if (!approvalId || !['approve', 'reject'].includes(decision)) {
            return { success: false, message: 'Parameter keputusan tidak valid.' };
        }

        const newStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';

        await db.update(schema.approvalRequests).set({ status: newStatus }).where(and(eq(schema.approvalRequests.id, approvalId), eq(schema.approvalRequests.unitId, unitId)));

        await db.insert(schema.approvalLogs).values({
            requestId: approvalId,
            approverId: String(userId),
            action: decision === 'approve' ? 'APPROVE' : 'REJECT',
            note: body.note || null
        });

        return { success: true, message: decision === 'approve' ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.' };
    }

    if (body.action === 'run-payroll') {
        const employeesInUnit = await db.select({ id: schema.employees.id, salary: schema.employees.salary }).from(schema.employees).where(and(eq(schema.employees.companyId, unitId), eq(schema.employees.status, 'active')));
        const { month, year } = thisMonthWIB();

        for (const emp of employeesInUnit) {
            const basicSalary = Number(emp.salary || 0);
            const allowances = 0;
            const deductions = 0;
            const netSalary = basicSalary + allowances - deductions;
            await db.insert(schema.payrolls).values({
                employeeId: emp.id,
                periodMonth: month,
                periodYear: year,
                basicSalary,
                allowances,
                deductions,
                netSalary,
                paymentStatus: 'unpaid'
            });
        }

        return { success: true, message: 'Payroll run berhasil dibuat untuk semua karyawan aktif.' };
    }

    if (body.action === 'mark-payroll-paid') {
        const { month, year } = thisMonthWIB();

        const payrollsToUpdate = await db.select({ id: schema.payrolls.id })
            .from(schema.payrolls)
            .innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId))
            .where(and(
                eq(schema.employees.companyId, unitId),
                eq(schema.payrolls.periodMonth, month),
                eq(schema.payrolls.periodYear, year)
            ));
        
        const payrollIds = payrollsToUpdate.map(p => p.id);
        if (payrollIds.length > 0) {
            await db.update(schema.payrolls)
                .set({ paymentStatus: 'paid' })
                .where(inArray(schema.payrolls.id, payrollIds));
        }

        return { success: true, message: 'Status payroll bulan ini diubah menjadi paid.' };
    }

    return { success: false, message: 'Aksi tidak dikenali.' };
}