import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ params, cookies }) {
    const slug = params.slug?.trim();

    if (!slug) {
        throw error(400, 'Unit bisnis tidak ditemukan');
    }

    const userId = await getCurrentUserId(cookies);
    if (!userId) {
        throw error(401, 'Silakan login terlebih dahulu');
    }

    try {
        const units = await db.select({ id: schema.unitBisnis.id, nama_unit: schema.unitBisnis.namaUnit, slug: schema.unitBisnis.slug })
            .from(schema.unitBisnis)
            .where(and(eq(schema.unitBisnis.slug, slug), eq(schema.unitBisnis.userId, userId)))
            .limit(1);

        if (units.length === 0) {
            throw error(404, 'Unit bisnis tidak ditemukan');
        }

        const unit = units[0];
        const employees = await db.select({ id: schema.employees.id, full_name: schema.employees.fullName, position: schema.employees.position })
            .from(schema.employees)
            .where(eq(schema.employees.companyId, unit.id))
            .orderBy(asc(schema.employees.fullName));

        // Default role options for various bisnis sectors
        const defaultRoles = [
            'owner', 'admin', 'manajer', 'kepala cabang', 'supervisor', 'leader', 'boss',
            'finance', 'keuangan', 'akuntan', 'accounting', 'pembukuan', 'audit',
            'hr', 'sdm', 'people', 'recruiter', 'talenta',
            'kasir', 'cashier', 'teller', 'pos',
            'operator', 'operasional', 'produksi', 'production',
            'gudang', 'logistik', 'warehouse', 'inventori', 'stock',
            'service', 'layanan', 'dukungan', 'support', 'customer service', 'pelayanan pelanggan',
            'resepsionis', 'front office', 'back office', 'administrasi',
            'teknisi', 'technician', 'support it', 'engineering',
            'sopir', 'driver', 'purchasing', 'pengadaan', 'procurement',
            'quality', 'quality control', 'pemeliharaan', 'maintenance', 'safety',
            'marketing', 'pemasaran', 'digital marketing', 'e-commerce', 'brand', 'content',
            'sales', 'penjualan', 'business development', 'growth', 'community', 'event',
            'staff', 'staf', 'karyawan', 'employee'
        ];

        // Try to read custom roles from unit row (if stored in JSON/text column)
        let customRoles = [];
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
                const [unitCols] = await db.execute(sql`
                    SELECT ${sql.raw(cols.map((c) => `\`` + c + `\``).join(', '))} FROM unit_bisnis WHERE id = ${unit.id} LIMIT 1
                `);
                const row = unitCols[0] || {};
                for (const col of cols) {
                    if (row && row[col]) {
                        try {
                            const parsed = typeof row[col] === 'string' ? JSON.parse(row[col]) : row[col];
                            if (Array.isArray(parsed)) {
                                customRoles = parsed.map(r => String(r).trim()).filter(Boolean);
                                break;
                            }
                        } catch (e) {
                            if (typeof row[col] === 'string' && row[col].includes(',')) {
                                customRoles = row[col].split(',').map(s => s.trim()).filter(Boolean);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Tidak dapat memuat custom roles:', e?.message || e);
        }

        const availableRoles = Array.from(new Set([...defaultRoles, ...customRoles]));

        return {
            unit,
            employees,
            availableRoles
        };
    } catch (e) {
        console.error("Error di HR Add Load:", e);
        throw error(500, 'Gagal memuat form');
    }
}