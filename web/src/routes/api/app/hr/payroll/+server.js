import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { payrolls, employees, riwayatAksi, transaksi, salaryComponents } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import { thisMonthWIB } from '$lib/server/dateUtils';

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseMonthYear(monthYearStr) {
    const { month: wm, year: wy } = thisMonthWIB();
    if (!monthYearStr) return { month: wm, year: wy };
    const parts = monthYearStr.trim().split(' ');
    if (parts.length < 2) return { month: wm, year: wy };
    let monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
    if (monthIndex === -1) monthIndex = wm - 1;
    const year = parseInt(parts[1]) || wy;
    return { month: monthIndex + 1, year };
}

function formatMonthYear(month, year) {
    const idx = (month - 1) >= 0 && (month - 1) < 12 ? (month - 1) : 0;
    return `${MONTH_NAMES[idx]} ${year}`;
}

// GET: Fetch payroll data
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const type = url.searchParams.get('type') || 'all';
        const monthYear = url.searchParams.get('monthYear');

        if (type === 'employees') {
            // Get employees for payroll processing
            const employeeList = await db.query.employees.findMany({
                where: and(
                    eq(employees.companyId, Number(unitId)),
                    eq(employees.status, 'active')
                ),
                orderBy: employees.fullName
            });

            const employeesWithComponents = await Promise.all(
                employeeList.map(async (emp) => {
                    // Get salary components for this employee
                    const components = await db.select()
                        .from(salaryComponents)
                        .where(eq(salaryComponents.employeeId, emp.id));

                    const additions = components.filter(c => c.type === 'addition');
                    const deductions = components.filter(c => c.type === 'deduction');

                    const totalAdditions = additions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
                    const totalDeductions = deductions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

                    return {
                        id: emp.id,
                        fullName: emp.fullName,
                        position: emp.position,
                        basicSalary: Number(emp.salary || 0),
                        additions,
                        deductions,
                        totalAdditions,
                        totalDeductions,
                        netSalary: Number(emp.salary || 0) + totalAdditions - totalDeductions
                    };
                })
            );

            return json({ 
                success: true, 
                employees: employeesWithComponents 
            });
        }

        if (type === 'history') {
            const conditions = [eq(payrolls.employeeId, sql`employees.id`)];
            if (monthYear) {
                const { month, year } = parseMonthYear(monthYear);
                conditions.push(
                    eq(payrolls.periodMonth, month),
                    eq(payrolls.periodYear, year)
                );
            }

            const payrollHistory = await db.query.payrolls.findMany({
                orderBy: [desc(payrolls.id)],
                limit: 100,
                with: {
                    employee: {
                        columns: {
                            id: true,
                            fullName: true,
                            position: true
                        }
                    }
                }
            });

            return json({ 
                success: true, 
                payrolls: payrollHistory.map(p => ({
                    id: p.id,
                    employeeId: p.employeeId,
                    employeeName: p.employee?.fullName || 'Employee',
                    position: p.employee?.position || '',
                    monthYear: formatMonthYear(p.periodMonth, p.periodYear),
                    periodMonth: p.periodMonth,
                    periodYear: p.periodYear,
                    basicSalary: Number(p.basicSalary || 0),
                    allowances: Number(p.allowances || 0),
                    deductions: Number(p.deductions || 0),
                    netSalary: Number(p.netSalary || 0),
                    paymentStatus: p.paymentStatus,
                    createdAt: p.createdAt || ''
                }))
            });
        }

        return json({ success: false, message: 'Type tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'GET hr/payroll error');
        return json({ success: false, message: 'Gagal mengambil data payroll' }, { status: 500 });
    }
}

// POST: Run payroll atau create payroll records
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'run-payroll') {
            const schema = z.object({
                action: z.literal('run-payroll'),
                unitId: z.coerce.number().int().positive(),
                monthYear: z.string().min(1),
                employeeIds: z.array(z.coerce.number().int()).min(1, 'Minimal 1 karyawan'),
                autoCreateTransaction: z.boolean().default(true)
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input run payroll tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { unitId, monthYear, employeeIds, autoCreateTransaction } = body;
            const { month, year } = parseMonthYear(monthYear);

            let processedCount = 0;
            let totalPayroll = 0;

            await db.transaction(async (tx) => {
                for (const employeeId of employeeIds) {
                    // Check if payroll already exists for this period
                    const existing = await tx.query.payrolls.findFirst({
                        where: and(
                            eq(payrolls.employeeId, employeeId),
                            eq(payrolls.periodMonth, month),
                            eq(payrolls.periodYear, year)
                        )
                    });

                    if (existing) continue; // Skip if already processed

                    // Get employee data
                    const employee = await tx.query.employees.findFirst({
                        where: eq(employees.id, employeeId)
                    });

                    if (!employee) continue;

                    // Get salary components
                    const components = await tx.select()
                        .from(salaryComponents)
                        .where(eq(salaryComponents.employeeId, employeeId));

                    const additions = components.filter(c => c.type === 'addition');
                    const deductions = components.filter(c => c.type === 'deduction');

                    const basicSalary = Number(employee.salary || 0);
                    const totalAdditions = additions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
                    const totalDeductions = deductions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
                    const netSalary = basicSalary + totalAdditions - totalDeductions;

                    // Insert payroll record
                    await tx.insert(payrolls).values({
                        employeeId,
                        periodMonth: month,
                        periodYear: year,
                        basicSalary: String(basicSalary),
                        allowances: String(totalAdditions),
                        deductions: String(totalDeductions),
                        netSalary: String(netSalary),
                        paymentStatus: 'unpaid'
                    });

                    // Create expense transaction if enabled
                    if (autoCreateTransaction && netSalary > 0) {
                        await tx.insert(transaksi).values({
                            userId,
                            unitId: Number(unitId),
                            keterangan: `Gaji ${employee.fullName} (${monthYear})`,
                            nominal: String(netSalary),
                            totalHarga: String(netSalary),
                            kategoriTrx: 'KELUAR',
                            metodeBayar: 'TRANSFER'
                        });
                    }

                    processedCount++;
                    totalPayroll += netSalary;
                }

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `Payroll dijalankan untuk ${processedCount} karyawan (${monthYear}). Total: Rp ${totalPayroll.toLocaleString('id-ID')}`,
                    kategori: 'HR',
                    tipe: 'success'
                });
            });

            return json({ 
                success: true, 
                message: `Payroll berhasil dijalankan untuk ${processedCount} karyawan`,
                data: {
                    processedCount,
                    totalAmount: totalPayroll,
                    monthYear
                }
            });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'POST hr/payroll error');
        return json({ success: false, message: 'Gagal menjalankan payroll: ' + err.message }, { status: 500 });
    }
}

// PUT: Mark payroll as paid atau update payroll
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'mark-paid') {
            const schema = z.object({
                action: z.literal('mark-paid'),
                payrollIds: z.array(z.coerce.number().int()).min(1, 'Minimal 1 payroll'),
                unitId: z.coerce.number().int().positive(),
                paidDate: z.string().optional(),
                notes: z.string().optional()
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input mark paid tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { payrollIds, unitId, paidDate, notes } = body;

            let markedCount = 0;
            let totalPaid = 0;

            await db.transaction(async (tx) => {
                for (const payrollId of payrollIds) {
                    const payroll = await tx.query.payrolls.findFirst({
                        where: eq(payrolls.id, payrollId),
                        with: {
                            employee: {
                                columns: {
                                    fullName: true
                                }
                            }
                        }
                    });

                    if (!payroll || payroll.paymentStatus === 'paid') continue;

                    await tx.update(payrolls)
                        .set({ 
                            paymentStatus: 'paid',
                            paidDate: paidDate || new Date().toISOString().split('T')[0]
                        })
                        .where(eq(payrolls.id, payrollId));

                    markedCount++;
                    totalPaid += Number(payroll.netSalary || 0);
                }

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `${markedCount} payroll ditandai sudah dibayar. Total: Rp ${totalPaid.toLocaleString('id-ID')}`,
                    kategori: 'HR',
                    tipe: 'success'
                });
            });

            return json({ 
                success: true, 
                message: `${markedCount} payroll berhasil ditandai sudah dibayar`,
                data: {
                    markedCount,
                    totalPaid
                }
            });
        }

        if (action === 'update-payroll') {
            const { payrollId, unitId, basicSalary, allowances, deductions, netSalary } = body;

            if (!payrollId) {
                return json({ success: false, message: 'payrollId wajib diisi' }, { status: 400 });
            }

            const payroll = await db.query.payrolls.findFirst({
                where: eq(payrolls.id, Number(payrollId))
            });

            if (!payroll) {
                return json({ success: false, message: 'Payroll tidak ditemukan' }, { status: 404 });
            }

            const updateData = {};
            if (basicSalary !== undefined) updateData.basicSalary = String(basicSalary);
            if (allowances !== undefined) updateData.allowances = String(allowances);
            if (deductions !== undefined) updateData.deductions = String(deductions);
            if (netSalary !== undefined) updateData.netSalary = String(netSalary);

            if (Object.keys(updateData).length === 0) {
                return json({ success: false, message: 'Tidak ada data yang diubah' }, { status: 400 });
            }

            await db.update(payrolls)
                .set(updateData)
                .where(eq(payrolls.id, Number(payrollId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Data payroll diperbarui',
                kategori: 'HR',
                tipe: 'info'
            });

            return json({ success: true, message: 'Payroll berhasil diperbarui' });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT hr/payroll error');
        return json({ success: false, message: 'Gagal update payroll: ' + err.message }, { status: 500 });
    }
}

// DELETE: Delete payroll record
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payrollId = url.searchParams.get('payrollId');
    const unitId = url.searchParams.get('unitId');

    if (!payrollId) {
        return json({ success: false, message: 'payrollId wajib diisi' }, { status: 400 });
    }

    try {
        const payroll = await db.query.payrolls.findFirst({
            where: eq(payrolls.id, Number(payrollId)),
            with: {
                employee: {
                    columns: {
                        fullName: true
                    }
                }
            }
        });

        if (!payroll) {
            return json({ success: false, message: 'Payroll tidak ditemukan' }, { status: 404 });
        }

        if (payroll.paymentStatus === 'paid') {
            return json({ success: false, message: 'Payroll yang sudah dibayar tidak dapat dihapus' }, { status: 400 });
        }

        await db.delete(payrolls)
            .where(eq(payrolls.id, Number(payrollId)));

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId),
            pesan: `Payroll ${payroll.employee?.fullName} dihapus`,
            kategori: 'HR',
            tipe: 'warning'
        });

        return json({ success: true, message: 'Payroll berhasil dihapus' });

    } catch (err) {
        log.api.error({ err }, 'DELETE hr/payroll error');
        return json({ success: false, message: 'Gagal menghapus payroll' }, { status: 500 });
    }
}