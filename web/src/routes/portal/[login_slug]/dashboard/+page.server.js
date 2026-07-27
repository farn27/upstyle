// src/routes/p/[slug]/dashboard/+page.server.js
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, employees, transaksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { detectRoleCategory, requireVerifiedStaffSession } from '$lib/server/portalAuth';
import { buildStrategicBI } from '$lib/server/strategicBI';

export async function load({ cookies, params }) {
    const staffSession = await requireVerifiedStaffSession(cookies, params.login_slug);

    try {
        const units = await db.select({
            id: unitBisnis.id,
            nama_unit: unitBisnis.namaUnit,
            alamat: unitBisnis.alamat,
            slug: unitBisnis.slug,
            login_slug: unitBisnis.loginSlug,
            user_id: unitBisnis.userId
        })
        .from(unitBisnis)
        .where(and(
            eq(unitBisnis.id, staffSession.unit_id),
            eq(unitBisnis.loginSlug, params.login_slug),
            eq(unitBisnis.isPortalActive, 1)
        ));

        if (units.length === 0) {
            cookies.delete('staff_session_token', { path: '/' });
            cookies.delete('staff_session', { path: '/' });
            throw redirect(302, `/portal/${params.login_slug}`);
        }

        const employeesRows = await db.select({
            full_name: employees.fullName,
            role: employees.role,
            position: employees.position,
            job_grade: employees.jobGrade,
            division: employees.division
        })
        .from(employees)
        .where(and(
            eq(employees.id, staffSession.id),
            eq(employees.companyId, units[0].id),
            eq(employees.status, 'active'),
            eq(employees.userId, units[0].user_id)
        ))
        .limit(1);

        if (employeesRows.length === 0) {
            cookies.delete('staff_session_token', { path: '/' });
            cookies.delete('staff_session', { path: '/' });
            throw redirect(302, `/portal/${params.login_slug}`);
        }

        const employee = employeesRows[0];
        const unit = units[0];
        const roleCategory = detectRoleCategory(employee.role || employee.division);

        // 2. Ambil 5 Transaksi Terakhir
        const transactions = await db.select({
            id: transaksi.id,
            keterangan: transaksi.keterangan,
            kategori_trx: transaksi.kategoriTrx,
            nominal: transaksi.totalHarga,
            tanggal: transaksi.tanggal
        })
        .from(transaksi)
        .where(eq(transaksi.unitId, unit.id))
        .orderBy(desc(transaksi.tanggal))
        .limit(5);

        // 3. Kalkulasi Finansial Kompleks (Saldo, Masuk, Keluar)
        const finStats = await db.select({
            totalMasuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'MASUK' THEN ${transaksi.totalHarga} ELSE 0 END)`,
            totalKeluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'KELUAR' THEN ${transaksi.totalHarga} ELSE 0 END)`
        })
        .from(transaksi)
        .where(eq(transaksi.unitId, unit.id));

        const stats = finStats[0];
        const saldoSaatIni = (stats.totalMasuk || 0) - (stats.totalKeluar || 0);
        const bi = buildStrategicBI({
            totalMasuk: stats.totalMasuk,
            totalKeluar: stats.totalKeluar
        });

        return {
            employee,
            roleCategory,
            unit,
            transactions: transactions || [],
            saldoSaatIni,
            totalMasuk: stats.totalMasuk || 0,
            selisih: saldoSaatIni,
            strategicBI: {
                ...bi,
                margin: Number(bi.margin),
                suggestion:
                    Number(bi.margin) < 10
                        ? 'Margin tipis. Pertimbangkan efisiensi biaya operasional atau penyesuaian harga jual.'
                        : 'Performa stabil. Fokus pada retensi pelanggan dan ekspansi stok produk terlaris.'
            }
        };

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        throw error(500, "Internal Server Error");
    }
}
export const actions = {
    logout: async ({ cookies, params }) => {
        const token = cookies.get('staff_session_token');
        if (token) {
            const { deleteStaffSession } = await import('$lib/server/staffSession');
            await deleteStaffSession(token).catch(() => {});
        }
        cookies.delete('staff_session_token', { path: '/' });
        cookies.delete('staff_session', { path: '/' });
        throw redirect(303, `/portal/${params.login_slug}`);
    }
};