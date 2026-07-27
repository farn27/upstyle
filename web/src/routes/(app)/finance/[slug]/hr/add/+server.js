import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { hashEmployeePassword } from '$lib/server/employeePassword';

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function POST({ request, params, cookies }) {
    try {
        const body = await request.json();
        const userId = await getCurrentUserId(cookies);

        if (!userId) {
            return json({ success: false, message: 'Sesi berakhir, silakan login ulang.' }, { status: 401 });
        }

        const unitSah = await db.select({ id: schema.unitBisnis.id }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));

        if (unitSah.length === 0) {
            return json({
                success: false,
                message: 'Unit bisnis tidak ditemukan atau Anda tidak memiliki akses ke unit ini.'
            }, { status: 403 });
        }

        const unitId = unitSah[0].id;
        const fullName = String(body.full_name || '').trim();
        const position = String(body.position || '').trim();

        if (!fullName || !position) {
            return json({ success: false, message: 'Nama lengkap dan jabatan wajib diisi.' }, { status: 400 });
        }

        // Determine allowed roles for this unit (merge defaults with any unit-specific roles)
        const defaultRoles = ['owner', 'admin', 'manager', 'finance', 'hr', 'cashier', 'operator', 'staff', 'employee'];
        let unitCustomRoles = [];
        try {
            const maybeCols = ['custom_roles', 'roles_json', 'available_roles'];
            const [existingCols] = await db.execute(sql`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'unit_bisnis'
                   AND COLUMN_NAME IN ('custom_roles','roles_json','available_roles')
            `);
            const cols = existingCols.map((row) => row.COLUMN_NAME);
            if (cols.length > 0) {
                const [unitRow] = await db.execute(sql`
                    SELECT ${sql.raw(cols.map((c) => '\`' + c + '\`').join(', '))} FROM unit_bisnis WHERE id = ${unitId} LIMIT 1
                `);
                const row = unitRow[0] || {};
                for (const col of cols) {
                    if (row && row[col]) {
                        try {
                            const parsed = typeof row[col] === 'string' ? JSON.parse(row[col]) : row[col];
                            if (Array.isArray(parsed)) {
                                unitCustomRoles = parsed.map(r => String(r).trim()).filter(Boolean);
                                break;
                            }
                        } catch (e) {
                            if (typeof row[col] === 'string' && row[col].includes(',')) {
                                unitCustomRoles = row[col].split(',').map(s => s.trim()).filter(Boolean);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Gagal baca custom roles unit:', err?.message || err);
        }
        const allowedRoles = Array.from(new Set([...defaultRoles, ...unitCustomRoles]));

        // Accept either a selected known role, or a provided custom role string
        let roleValue = String(body.role || '').trim();
        if (roleValue === '__custom__') {
            roleValue = String(body.role_custom || '').trim();
        }
        if (!roleValue) roleValue = 'employee';
        // sanitize role: allow letters, numbers, space, dash, underscore, limit length
        roleValue = roleValue.replace(/[^\w\s-]/g, '').trim().slice(0, 60);
        // If allowedRoles is non-empty, prefer exact match (case-insensitive) if present
        const found = allowedRoles.find(r => String(r).toLowerCase() === roleValue.toLowerCase());
        const role = found ? String(found) : roleValue;
        const status = ['active', 'inactive'].includes(body.status) ? body.status : 'active';
        const joinDate = String(body.join_date || '').trim() || null;
        const contractStart = String(body.contract_start || body.join_date || '').trim() || joinDate;
        const contractEnd = String(body.contract_end || '').trim() || null;
        const salary = Number(body.salary || 0);
        const password = String(body.password || '').trim() || '123456';
        const pin = String(body.pin || '').trim() || '1234';
        const passwordHash = await hashEmployeePassword(password);
        const pinHash = await hashEmployeePassword(pin);

        const slugKaryawan = slugify(fullName);
        const finalSlug = `${slugKaryawan}-${Math.floor(1000 + Math.random() * 9000)}`;

        await db.insert(schema.employees).values({
                companyId: unitId,
                userId,
                managerId: body.manager_id || null,
                fullName,
                slug: finalSlug,
                password: passwordHash,
                pin: pinHash,
                role,
                position,
                jobGrade: body.job_grade || 'Junior',
                division: body.division || null,
                placementLocation: body.placement_location || null,
                salary,
                joinDate,
                status,
                email: body.email || null,
                phone: body.phone || null,
                idNumber: body.id_number || null,
                employmentStatus: body.employment_status || null,
                bankName: body.bank_name || null,
                bankAccountNumber: body.bank_account_number || null,
                taxId: body.tax_id || null,
                address: body.address || null,
                contractStart,
                contractEnd,
                emergencyContact: body.emergency_contact || null,
                emergencyRelation: body.emergency_relation || null,
                bloodType: body.blood_type || null
        });

        const pesanNotif = `Berhasil menambahkan karyawan: ${fullName}`;
        try {
            await db.insert(schema.riwayatAksi).values({
                userId,
                unitId,
                pesan: pesanNotif,
                kategori: 'Human Resources',
                link: `/finance/${params.slug}/hr/${finalSlug}`,
                tipe: 'success'
            });
        } catch (errNotif) {
            console.error('❌ Gagal mencatat riwayat:', errNotif.message);
        }

        return json({
            success: true,
            message: pesanNotif,
            data: { slug: finalSlug }
        });
    } catch (error) {
        console.error('❌ SQL ERROR UTAMA:', error);

        if (error.errno === 1265) {
            return json({ success: false, message: 'Gagal: format data tidak sesuai (Data truncation).' }, { status: 400 });
        }

        return json({
            success: false,
            message: 'Terjadi kesalahan sistem: ' + error.message
        }, { status: 500 });
    }
}