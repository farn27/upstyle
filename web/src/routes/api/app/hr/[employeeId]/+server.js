import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees, employeeDocuments, employeeKpi, employeeHistory, riwayatAksi, salaryComponents } from '$lib/server/schema';
import { eq, desc, asc, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { karyawanMilikUser } from '$lib/server/apiUnitGuard';
import { log } from '$lib/server/logger';

// GET /api/app/hr/[employeeId] — detail karyawan lengkap
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const empId = Number(params.employeeId);
    if (!empId) return json({ success: false, message: 'employeeId tidak valid' }, { status: 400 });

    try {
        const emp = await karyawanMilikUser(db, userId, empId);
        if (!emp) return json({ success: false, message: 'Karyawan tidak ditemukan' }, { status: 404 });

        const [komponen, documents, kpis, history] = await Promise.all([
            db.select().from(salaryComponents).where(eq(salaryComponents.employeeId, empId)).orderBy(asc(salaryComponents.type), asc(salaryComponents.id)),
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
                // komponen gaji (tunjangan / potongan) yang dipakai saat proses payroll
                components: komponen.map(c => ({ id: c.id, employeeId: empId, name: c.name || '', amount: Number(c.amount || 0), type: c.type || 'addition' })),
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
        if (!(await karyawanMilikUser(db, userId, empId))) {
            return json({ success: false, message: 'Karyawan tidak ditemukan' }, { status: 404 });
        }

        const body = await request.json();
        const { fullName, position, salary, email, phone, division, status, employmentStatus, bankName, bankAccountNumber, address, contractStart, contractEnd } = body;

        /** @type {Record<string, any>} */
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

        if (Object.keys(updateData).length === 0) return json({ success: false, message: 'Tidak ada data yang diubah' }, { status: 400 });
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

// POST /api/app/hr/[employeeId] — kelola komponen gaji: { action: 'add-component', component: { name, amount, type } } | { action: 'delete-component', componentId }
export async function POST({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const empId = Number(params.employeeId);
    if (!empId) return json({ success: false, message: 'employeeId tidak valid' }, { status: 400 });
    try {
        const emp = await karyawanMilikUser(db, userId, empId);
        if (!emp) return json({ success: false, message: 'Karyawan tidak ditemukan' }, { status: 404 });
        const body = await request.json();

        if (body.action === 'add-component') {
            const c = body.component || {};
            const nama = String(c.name || '').trim().slice(0, 100);
            const nominal = Number(c.amount);
            const tipe = c.type === 'deduction' ? 'deduction' : 'addition';
            if (!nama) return json({ success: false, message: 'Nama komponen wajib diisi' }, { status: 422 });
            if (!(nominal > 0)) return json({ success: false, message: 'Nominal harus lebih dari 0' }, { status: 422 });
            await db.insert(salaryComponents).values({ employeeId: empId, name: nama, amount: String(nominal), type: tipe });
            await db.insert(riwayatAksi).values({ userId, unitId: emp.companyId, pesan: `Komponen gaji ${tipe === 'addition' ? 'tunjangan' : 'potongan'} "${nama}" ditambahkan untuk ${emp.fullName}`, kategori: 'HR', tipe: 'info' });
            return json({ success: true, message: 'Komponen gaji ditambahkan' });
        }
        if (body.action === 'delete-component') {
            const compId = Number(body.componentId);
            if (!compId) return json({ success: false, message: 'componentId tidak valid' }, { status: 400 });
            const [r] = await db.delete(salaryComponents).where(and(eq(salaryComponents.id, compId), eq(salaryComponents.employeeId, empId)));
            if (!r?.affectedRows) return json({ success: false, message: 'Komponen tidak ditemukan' }, { status: 404 });
            return json({ success: true, message: 'Komponen gaji dihapus' });
        }
        return json({ success: false, message: 'Aksi tidak dikenali' }, { status: 400 });
    } catch (err) {
        log.api.error({ err }, 'POST hr/[employeeId]');
        return json({ success: false, message: 'Gagal memproses komponen gaji' }, { status: 500 });
    }
}
