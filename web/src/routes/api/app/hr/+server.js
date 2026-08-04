import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees, attendance, payrolls, riwayatAksi, salaryComponents, transaksi, approvalRequests, shifts } from '$lib/server/schema';
import { eq, and, desc, inArray, like, isNull, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { hashEmployeePassword } from '$lib/server/employeePassword';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';
import { encryptField, decryptField } from '$lib/server/encryption';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';
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

// 1. GET: Ambil karyawan, absensi, payroll untuk sebuah unitId (with pagination)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const pagination = parsePagination(url);

        // Get total count for employees
        const [totalResult] = await db.select({ count: sql`count(*)` }).from(employees).where(eq(employees.companyId, Number(unitId)));
        const total = Number(totalResult.count) || 0;

        // Get paginated employees
        const employeeList = await db.query.employees.findMany({
            where: eq(employees.companyId, Number(unitId)),
            orderBy: [desc(employees.id)],
            limit: pagination.limit,
            offset: pagination.offset
        });

        // Get employee IDs for filtering attendance and payrolls
        const employeeIds = employeeList.map(e => e.id);

        // Get attendance (filter by employee IDs, not company_id)
        let attendanceList = [];
        if (employeeIds.length > 0) {
            attendanceList = await db.query.attendance.findMany({
                where: inArray(attendance.employeeId, employeeIds),
                orderBy: [desc(attendance.id)],
                with: {
                    employee: true
                }
            });
        }

        // Get payrolls (filter by employee IDs, not company_id)
        let payrollList = [];
        if (employeeIds.length > 0) {
            payrollList = await db.query.payrolls.findMany({
                where: inArray(payrolls.employeeId, employeeIds),
                orderBy: [desc(payrolls.id)],
                with: {
                    employee: true
                }
            });
        }

        // Get approval requests for HR module
        const approvalRequestsList = await db.select()
            .from(approvalRequests)
            .where(and(
                eq(approvalRequests.unitId, Number(unitId)),
                eq(approvalRequests.module, 'HR')
            ))
            .orderBy(desc(approvalRequests.id))
            .limit(50);

        // Get shifts for this unit
        const shiftsList = await db.select()
            .from(shifts)
            .where(eq(shifts.companyId, Number(unitId)))
            .orderBy(shifts.id);

        // Get salary components for employees
        let salaryComponentsList = [];
        if (employeeIds.length > 0) {
            salaryComponentsList = await db.select()
                .from(salaryComponents)
                .where(inArray(salaryComponents.employeeId, employeeIds));
        }

        // Map to mobile schema
        const mappedEmployees = employeeList.map(e => ({
            id: e.id,
            fullName: e.fullName || '',
            position: e.position || '',
            salary: Number(e.salary || 0),
            pin: decryptField(e.pin || '', true), // Decrypt PIN
            role: e.role || 'staff',
            unitId: e.companyId,
            // Don't expose sensitive fields in API response
            // taxId, bankAccountNumber, etc are excluded for security
        }));

        const mappedAttendance = attendanceList.map(a => {
            const dateStr = a.checkIn ? a.checkIn.split(' ')[0] : '';
            const checkInTime = a.checkIn ? a.checkIn.split(' ')[1]?.substring(0, 5) : '';
            const checkOutTime = a.checkOut ? a.checkOut.split(' ')[1]?.substring(0, 5) : null;
            
            let statusStr = "HADIR";
            if (a.status === 'absent') statusStr = "ALFA";
            if (a.status === 'on_leave') statusStr = "IZIN";

            return {
                id: a.id,
                employeeId: a.employeeId,
                date: dateStr,
                checkIn: checkInTime,
                checkOut: checkOutTime,
                status: statusStr
            };
        });

        const mappedPayroll = payrollList.map(p => ({
            id: p.id,
            employeeId: p.employeeId,
            monthYear: formatMonthYear(p.periodMonth, p.periodYear),
            salary: Number(p.basicSalary || 0),
            allowance: Number(p.allowances || 0),
            deduction: Number(p.deductions || 0),
            netSalary: Number(p.netSalary || 0),
            status: p.paymentStatus === 'paid' ? "DIBAYAR" : "PENDING"
        }));

        const mappedApprovals = approvalRequestsList.map(a => ({
            id: a.id,
            module: a.module,
            referenceId: a.referenceId,
            requesterId: a.requesterId,
            actionType: a.actionType,
            status: a.status,
            note: a.note || '',
            createdAt: a.createdAt || ''
        }));

        const mappedShifts = shiftsList.map(s => ({
            id: s.id,
            shiftName: s.shiftName || '',
            startTime: s.startTime || '',
            endTime: s.endTime || ''
        }));

        const mappedSalaryComponents = salaryComponentsList.map(sc => ({
            id: sc.id,
            employeeId: sc.employeeId,
            name: sc.name || '',
            amount: Number(sc.amount || 0),
            type: sc.type || 'addition'
        }));

        return json({
            success: true,
            data: {
                employees: mappedEmployees,
                attendance: mappedAttendance,
                payroll: mappedPayroll,
                approvalRequests: mappedApprovals,
                shifts: mappedShifts,
                salaryComponents: mappedSalaryComponents
            },
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: total,
                totalPages: Math.ceil(total / pagination.limit)
            }
        });

    } catch (err) {
        log.hr.error({ err }, 'API GET HR ERROR');
        return json({ success: false, message: "Gagal mengambil data HR" }, { status: 500 });
    }
}

// 2. POST: Tambah Karyawan, Check-In/Out, Run Payroll, Add Component
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        // ─── Zod validation per action ──────────────────────────────────────────
        if (action === 'create-employee') {
            const schema = z.object({
                action: z.literal('create-employee'),
                employee: z.object({
                    fullName: z.string().min(2, 'Nama minimal 2 karakter'),
                    position: z.string().min(1, 'Jabatan wajib diisi'),
                    salary: z.coerce.number().min(0),
                    pin: z.string().length(4, 'PIN harus 4 digit').regex(/^\d+$/),
                    role: z.enum(['staff', 'cashier', 'manager', 'employee']).default('staff'),
                    unitId: z.coerce.number().int().positive(),
                    taxId: z.string().optional(),
                    bankName: z.string().optional(),
                    bankAccountNumber: z.string().optional(),
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input HR tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'check-in') {
            const schema = z.object({
                action: z.literal('check-in'),
                employeeId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive(),
                date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
                time: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu HH:MM'),
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input check-in tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'check-out') {
            const schema = z.object({
                action: z.literal('check-out'),
                employeeId: z.coerce.number().int().positive(),
                date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                time: z.string().regex(/^\d{2}:\d{2}$/),
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input check-out tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'process-payroll') {
            const schema = z.object({
                action: z.literal('process-payroll'),
                payroll: z.object({
                    employeeId: z.coerce.number().int().positive(),
                    monthYear: z.string().min(1),
                    salary: z.coerce.number().min(0),
                    allowance: z.coerce.number().min(0).default(0),
                    deduction: z.coerce.number().min(0).default(0),
                    netSalary: z.coerce.number().min(0),
                    unitId: z.coerce.number().int().positive(),
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input payroll tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'approve-request' || action === 'reject-request') {
            const schema = z.object({
                action: z.enum(['approve-request', 'reject-request']),
                requestId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive(),
                note: z.string().optional()
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input approval tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }
        // ────────────────────────────────────────────────────────────────────────

        if (action === 'create-employee') {
            const { fullName, position, salary, pin, role, unitId, taxId, bankName, bankAccountNumber } = body.employee;
            
            const passwordHash = await hashEmployeePassword("123456");
            const pinHash = await hashEmployeePassword(pin || "1234");
            const encryptedPin = encryptField(pin || "1234", true); // Encrypt PIN
            const encryptedTaxId = encryptField(taxId || '', true); // Encrypt tax ID
            const encryptedBankAccount = encryptField(bankAccountNumber || '', true); // Encrypt bank account
            
            const slug = `${fullName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;

            const [result] = await db.insert(employees).values({
                companyId: Number(unitId), 
                userId, 
                fullName, 
                slug, 
                position, 
                salary: String(salary || 0), 
                role: role || 'staff', 
                password: passwordHash, 
                pin: encryptedPin,
                taxId: encryptedTaxId,
                bankName: bankName || null,
                bankAccountNumber: encryptedBankAccount,
                status: 'active'
            });

            // Save log action without sensitive data
            await db.insert(riwayatAksi).values({
                userId, unitId: Number(unitId), pesan: `Karyawan baru terdaftar: ${fullName} sebagai ${position}`, kategori: 'HR', tipe: 'success'
            });

            return json({ success: true, message: "Karyawan berhasil dibuat", data: { id: result.insertId } });
        }

        if (action === 'check-in') {
            const { employeeId, unitId, date, time } = body;
            
            const checkInDateTime = `${date} ${time}:00`;
            const [result] = await db.insert(attendance).values({
                employeeId: Number(employeeId), checkIn: checkInDateTime, status: 'present'
            });

            return json({ success: true, message: "Berhasil Check-In", data: { id: result.insertId } });
        }

        if (action === 'check-out') {
            const { employeeId, date, time } = body;
            
            const checkOutDateTime = `${date} ${time}:00`;
            
            // Find existing attendance check-in for this employee today
            const existingAttendance = await db.query.attendance.findFirst({
                where: and(eq(attendance.employeeId, Number(employeeId)), like(attendance.checkIn, `${date}%`), isNull(attendance.checkOut))
            });

            if (existingAttendance) {
                await db.update(attendance).set({ checkOut: checkOutDateTime }).where(eq(attendance.id, existingAttendance.id));
                return json({ success: true, message: "Berhasil Check-Out" });
            } else {
                return json({ success: false, message: "Belum melakukan Check-In hari ini" }, { status: 400 });
            }
        }

        if (action === 'process-payroll') {
            const { employeeId, monthYear, salary, allowance, deduction, netSalary, unitId } = body.payroll;
            const { month, year } = parseMonthYear(monthYear);

            await db.transaction(async (tx) => {
                await tx.insert(payrolls).values({
                    employeeId: Number(employeeId),
                    periodMonth: month,
                    periodYear: year,
                    basicSalary: String(salary),
                    allowances: String(allowance),
                    deductions: String(deduction),
                    netSalary: String(netSalary),
                    paymentStatus: 'paid'
                });

                // Get employee name
                const emp = await tx.query.employees.findFirst({
                    where: eq(employees.id, Number(employeeId))
                });
                const empName = emp ? emp.fullName : 'Karyawan';

                // Record financial expense
                await tx.insert(transaksi).values({
                    unitId: Number(unitId), userId, kategoriTrx: 'KELUAR', nominal: String(netSalary), totalHarga: String(netSalary), keterangan: `Gaji Karyawan: ${empName} (${monthYear})`
                });

                // Save action log
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `Penggajian diproses untuk ${empName} (${monthYear}) sebesar Rp ${String(netSalary)}`,
                    tipe: 'success',
                    kategori: 'HR'
                });
            });

            return json({ success: true, message: "Payroll berhasil diproses" });
        }

        if (action === 'approve-request') {
            const { requestId, unitId, note } = body;

            const request = await db.query.approvalRequests.findFirst({
                where: eq(approvalRequests.id, Number(requestId))
            });

            if (!request) {
                return json({ success: false, message: 'Request tidak ditemukan' }, { status: 404 });
            }

            await db.update(approvalRequests)
                .set({ status: 'APPROVED', note: note || 'Approved' })
                .where(eq(approvalRequests.id, Number(requestId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Approval request #${requestId} disetujui`,
                tipe: 'success',
                kategori: 'HR'
            });

            return json({ success: true, message: 'Request berhasil disetujui' });
        }

        if (action === 'reject-request') {
            const { requestId, unitId, note } = body;

            const request = await db.query.approvalRequests.findFirst({
                where: eq(approvalRequests.id, Number(requestId))
            });

            if (!request) {
                return json({ success: false, message: 'Request tidak ditemukan' }, { status: 404 });
            }

            await db.update(approvalRequests)
                .set({ status: 'REJECTED', note: note || 'Rejected' })
                .where(eq(approvalRequests.id, Number(requestId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Approval request #${requestId} ditolak`,
                tipe: 'warning',
                kategori: 'HR'
            });

            return json({ success: true, message: 'Request berhasil ditolak' });
        }

        return json({ success: false, message: "Aksi tidak dikenali" }, { status: 400 });

    } catch (err) {
        log.hr.error({ err }, 'API POST HR ERROR');
        return json({ success: false, message: "Gagal memproses aksi HR: " + err.message }, { status: 500 });
    }
}

// 3. DELETE: Nonaktifkan/Hapus Karyawan
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const employeeId = url.searchParams.get('employeeId');
    const unitId = url.searchParams.get('unitId');
    if (!employeeId || !unitId) return json({ success: false, message: "employeeId dan unitId wajib diisi" }, { status: 400 });

    try {
        const emp = await db.query.employees.findFirst({
            where: eq(employees.id, Number(employeeId))
        });
        if (!emp) return json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
        if (Number(emp.companyId) !== Number(unitId)) return json({ success: false, message: "Akses ditolak" }, { status: 403 });

        await db.update(employees).set({ status: 'inactive' }).where(eq(employees.id, Number(employeeId)));

        // Save action log
        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId), pesan: `Karyawan ${emp.fullName} dinonaktifkan`, kategori: 'HR', tipe: 'warning'
        });

        return json({ success: true, message: "Karyawan berhasil dinonaktifkan" });
    } catch (err) {
        log.hr.error({ err }, 'API DELETE HR ERROR');
        return json({ success: false, message: "Gagal menghapus karyawan" }, { status: 500 });
    }
}

// 4. PUT: Update Karyawan
export async function PUT({ request, url, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const employeeId = url.searchParams.get('employeeId');
    if (!employeeId) return json({ success: false, message: "employeeId wajib diisi" }, { status: 400 });

    try {
        const body = await request.json();
        
        const emp = await db.query.employees.findFirst({
            where: eq(employees.id, Number(employeeId))
        });
        if (!emp) return json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
        if (!emp.companyId) return json({ success: false, message: "Karyawan tidak memiliki unit" }, { status: 400 });
        
        const { fullName, position, salary, role, email, phone, division } = body;
        
        let updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (position !== undefined) updateData.position = position;
        if (salary !== undefined) updateData.salary = String(salary);
        if (role !== undefined) updateData.role = role;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (division !== undefined) updateData.division = division;

        if (Object.keys(updateData).length > 0) {
            await db.update(employees)
                .set(updateData)
                .where(eq(employees.id, Number(employeeId)));
                
            await db.insert(riwayatAksi).values({
                userId, 
                unitId: emp.companyId, 
                pesan: `Data karyawan diperbarui: ${updateData.fullName || emp.fullName}`, 
                kategori: 'HR', 
                tipe: 'success'
            });
        }
        
        return json({ success: true, message: 'Karyawan berhasil diperbarui' });
    } catch (err) {
        log.hr.error({ err }, 'API PUT HR ERROR');
        return json({ success: false, message: "Gagal memperbarui karyawan" }, { status: 500 });
    }
}
