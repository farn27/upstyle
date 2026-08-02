import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { log } from '$lib/server/logger';

export async function POST({ request, params, cookies }) {
    const ownerUserId = await getCurrentUserId(cookies);
    const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: params.slug });
    if (!ownerUserId && !staffSession) {
        return json({ success: false, message: 'Sesi berakhir, silakan login ulang.' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeSlug, slug } = params;
    const action = body.action;

    // Ambil unit dulu untuk validasi akses
    const unitRows = await db.select({ id: schema.unitBisnis.id, user_id: schema.unitBisnis.userId }).from(schema.unitBisnis).where(eq(schema.unitBisnis.slug, slug)).limit(1);
    if (unitRows.length === 0) return json({ success: false, message: 'Unit tidak ditemukan.' }, { status: 404 });
    const unit = unitRows[0];

    const isOwner = ownerUserId && Number(unit.user_id) === Number(ownerUserId);
    const isStaff = staffSession && Number(staffSession.unit_id) === Number(unit.id) && Number(staffSession.owner_id) === Number(unit.user_id);
    if (!isOwner && !isStaff) return json({ success: false, message: 'Akses ditolak.' }, { status: 403 });

    // Ambil karyawan dalam unit
    const rows = await db.select({ id: schema.employees.id, role: schema.employees.role })
        .from(schema.employees)
        .where(and(eq(schema.employees.slug, employeeSlug), eq(schema.employees.companyId, unit.id)))
        .limit(1);

    if (rows.length === 0) {
        return json({ success: false, message: 'Karyawan tidak ditemukan atau bukan bagian dari unit ini.' }, { status: 404 });
    }

    const employeeId = rows[0].id;
    const employeeRole = (rows[0].role || '').toString().toLowerCase();

    try {
        if (action === 'update-employee') {
            // allowed: owner, hr, manager, admin
            const allowed = ['owner','admin','hr','manager'];
            const actorRole = (staffSession?.role || '').toString().toLowerCase();
            if (!isOwner && !allowed.includes(actorRole)) {
                return json({ success: false, message: 'Anda tidak punya izin untuk memperbarui data karyawan.' }, { status: 403 });
            }
            const emp = body.employee || {};
            await db.update(schema.employees).set({
                position: emp.position || null,
                division: emp.division || null,
                jobGrade: emp.job_grade || 'Junior',
                salary: emp.salary || 0,
                email: emp.email || null,
                phone: emp.phone || null,
                idNumber: emp.id_number || null,
                address: emp.address || null,
                contractStart: emp.contract_start || null,
                contractEnd: emp.contract_end || null,
                employmentStatus: emp.employment_status || null,
                placementLocation: emp.placement_location || null,
                bankName: emp.bank_name || null,
                bankAccountNumber: emp.bank_account_number || null,
                emergencyContact: emp.emergency_contact || null,
                emergencyRelation: emp.emergency_relation || null,
                bloodType: emp.blood_type || null,
                status: emp.status || 'active'
            }).where(eq(schema.employees.id, employeeId));
            return json({ success: true, message: 'Data karyawan berhasil diperbarui.' });
        }

        if (action === 'add-component') {
            // allowed: owner, hr
            const actorRole = (staffSession?.role || '').toString().toLowerCase();
            if (!isOwner && !['owner','hr','admin','manager'].includes(actorRole)) {
                return json({ success: false, message: 'Anda tidak punya izin menambah komponen gaji.' }, { status: 403 });
            }
            const comp = body.component || {};
            await db.insert(schema.salaryComponents).values({
                employeeId,
                name: comp.name || 'Komponen Baru',
                amount: Number(comp.amount) || 0,
                type: comp.type || 'addition'
            });
            return json({ success: true, message: 'Komponen gaji berhasil ditambahkan.' });
        }

        if (action === 'delete-component') {
            // allowed: owner, hr
            const actorRole = (staffSession?.role || '').toString().toLowerCase();
            if (!isOwner && !['owner','hr','admin','manager'].includes(actorRole)) {
                return json({ success: false, message: 'Anda tidak punya izin menghapus komponen gaji.' }, { status: 403 });
            }
            const componentId = Number(body.component_id);
            if (!componentId) {
                return json({ success: false, message: 'ID komponen tidak valid.' }, { status: 400 });
            }
            await db.delete(schema.salaryComponents)
                .where(and(eq(schema.salaryComponents.id, componentId), eq(schema.salaryComponents.employeeId, employeeId)));
            return json({ success: true, message: 'Komponen gaji berhasil dihapus.' });
        }

        return json({ success: false, message: 'Aksi tidak dikenali.' }, { status: 400 });
    } catch (err) {
        log.hr.error({ err }, 'Error POST HR detail');
        return json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
    }
}
