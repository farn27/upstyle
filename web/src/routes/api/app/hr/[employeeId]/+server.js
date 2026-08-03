import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees, employeeDocuments, employeeKpi, employeeHistory, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/hr/[employeeId] — detail karyawan lengkap
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const empId = Number(params.employeeId);
    if (!empId) return json({ success: false, message: 'employeeId tidak valid' }, { status: 400 });

    try {
        const emp = await db.query.employees.findFirst({ where: eq(employees.id, empId) });
        if (!emp) return json({ success: false, message: 'Karyawan tidak ditemukan' }, { status: 404 });

        const [documents, kpis, history] = await Promise.all([
            db.query.employeeDocuments.findMany({ where: eq(employeeDocuments.employeeId, empId), orderBy: [desc(employeeDocuments.id)] }),
            db.query.employeeKpi.findMany({ where: eq(employeeKpi.employeeId, empId), orderBy: [desc(employeeKpi.id)] }),
            db.query.employeeHistory.findMany({ where: eq(employeeHistory.employeeId, empId), orderBy: [desc(employeeHistory.id)] })
        ]);

        return json({
            success: true,
            data: {
                employee: {
                    id: emp.id, fullName: emp.fullName, position: emp.position,
                    salary: Number(emp.salary || 0), joinDate: emp.joinDate || '',
                    email: emp.email || '', phone: emp.phone || '',
                    division: emp.division || '', status: emp.status,
                    employmentStatus: emp.employmentStatus || '',
                    contractStart: emp.contractStart || '', contractEnd: emp.contractEnd || '',
                    bankName: emp.bankName || '', bankAccountNumber: emp.bankAccountNumber || '',
                    address: emp.address || '', emergencyContact: emp.emergencyContact || '',
                    jobGrade: emp.jobGrade || '', placementLocation: emp.placementLocation || ''
                },
                documents: documents.map(d => ({
                    id: d.id, documentType: d.documentType, fileName: d.fileName || '',
                    filePath: d.filePath, uploadedAt: d.uploadedAt || ''
                })),
                kpis: kpis.map(k => ({
                    id: k.id, periodMonth: k.periodMonth, periodYear: k.periodYear,
                    score: Number(k.score || 0), notes: k.notes || ''
                })),
                history: history.map(h => ({
                    id: h.id, oldPosition: h.oldPosition || '', newPosition: h.newPosition || '',
                    changeDate: h.changeDate || '', reason: h.reason || ''
                }))
            }
        });
    } catch (err) {
        log.api.error({ err }, 'GET hr/[employeeId]');
        return json({ success: false, message: 'Gagal memuat detail karyawan' }, { status: 500 });
    }
}

// PUT /api/app/hr/[employeeId] — update data karyawan
export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const empId = Number(params.employeeId);
    if (!empId) return json({ success: false, message: 'employeeId tidak valid' }, { status: 400 });

    try {
        const body = await request.json();
        const { fullName, position, salary, email, phone, division, status, employmentStatus, bankName, bankAccountNumber, address, contractStart, contractEnd } = body;

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (position) updateData.position = position;
        if (salary !== undefined) updateData.salary = String(salary);
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (division) updateData.division = division;
        if (status) updateData.status = status;
        if (employmentStatus) updateData.employmentStatus = employmentStatus;
        if (bankName) updateData.bankName = bankName;
        if (bankAccountNumber) updateData.bankAccountNumber = bankAccountNumber;
        if (address) updateData.address = address;
        if (contractStart) updateData.contractStart = contractStart;
        if (contractEnd) updateData.contractEnd = contractEnd;

        await db.update(employees).set(updateData).where(eq(employees.id, empId));

        const emp = await db.query.employees.findFirst({ where: eq(employees.id, empId), columns: { companyId: true, fullName: true } });
        if (emp?.companyId) {
            await db.insert(riwayatAksi).values({
                userId, unitId: emp.companyId,
                pesan: `Data karyawan ${emp.fullName} diperbarui`,
                kategori: 'HR', tipe: 'info'
            });
        }

        return json({ success: true, message: 'Data karyawan berhasil diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT hr/[employeeId]');
        return json({ success: false, message: 'Gagal update karyawan' }, { status: 500 });
    }
}
