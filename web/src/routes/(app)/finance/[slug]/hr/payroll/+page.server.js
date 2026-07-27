import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import * as schema from '$lib/server/schema';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';
import { inngest } from '$lib/server/inngest';

export async function load({ params, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');

	const units = await db.select({ id: schema.unitBisnis.id, nama_unit: schema.unitBisnis.namaUnit, slug: schema.unitBisnis.slug }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));
	if (!units.length) throw error(404, 'Unit tidak ditemukan');
	const unit = units[0];

	const { month, year } = thisMonthWIB();

	const rawPayrolls = await db.select({
        ...schema.payrolls,
        full_name: schema.employees.fullName,
        position: schema.employees.position
    })
    .from(schema.payrolls)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId))
    .where(and(eq(schema.employees.companyId, unit.id), eq(schema.payrolls.periodMonth, month), eq(schema.payrolls.periodYear, year)))
    .orderBy(asc(schema.employees.fullName));
    
    const payrolls = rawPayrolls.map(p => {
        const snake = {};
        for (const [k, v] of Object.entries(p)) {
            snake[k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = v;
        }
        return snake;
    });

	const summaryRaw = await db.select({
        total: sql`COUNT(*)`.mapWith(Number),
        paid_count: sql`SUM(CASE WHEN ${schema.payrolls.paymentStatus} = 'paid' THEN 1 ELSE 0 END)`.mapWith(Number),
        total_net: sql`COALESCE(SUM(${schema.payrolls.netSalary}), 0)`.mapWith(Number)
    })
    .from(schema.payrolls)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId))
    .where(and(eq(schema.employees.companyId, unit.id), eq(schema.payrolls.periodMonth, month), eq(schema.payrolls.periodYear, year)));

	return { unit, payrolls, summary: summaryRaw[0] || {}, period: { month, year } };
}

export const actions = {
	runPayroll: async ({ params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return { success: false, message: 'Sesi berakhir' };

		const units = await db.select({ id: schema.unitBisnis.id }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));
		if (!units.length) return { success: false, message: 'Unit tidak ditemukan' };

		const unitId = units[0].id;
		const { month, year } = thisMonthWIB();

		const existing = await db.select({ c: sql`COUNT(*)`.mapWith(Number) })
            .from(schema.payrolls)
            .innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId))
            .where(and(eq(schema.employees.companyId, unitId), eq(schema.payrolls.periodMonth, month), eq(schema.payrolls.periodYear, year)));

		if (Number(existing[0]?.c) > 0) {
			return { success: false, message: 'Payroll bulan ini sudah pernah di-generate.' };
		}

		const employees = await db.select({ id: schema.employees.id, salary: schema.employees.salary }).from(schema.employees).where(and(eq(schema.employees.companyId, unitId), eq(schema.employees.status, 'active')));

		for (const emp of employees) {
			const basic = Number(emp.salary || 0);
            await db.insert(schema.payrolls).values({
                employeeId: emp.id,
                periodMonth: month,
                periodYear: year,
                basicSalary: basic,
                allowances: 0,
                deductions: 0,
                netSalary: basic,
                paymentStatus: 'unpaid'
            });
		}

        // Ambil ID payroll yang baru saja dibuat
        const newPayrolls = await db.select({ id: schema.payrolls.id })
            .from(schema.payrolls)
            .innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId))
            .where(and(eq(schema.employees.companyId, unitId), eq(schema.payrolls.periodMonth, month), eq(schema.payrolls.periodYear, year)));
        
        const payrollIds = newPayrolls.map(p => p.id);

        // Lempar pekerjaan kirim WA Slip Gaji ke background (Inngest Worker)
        if (payrollIds.length > 0) {
            await inngest.send({
                name: 'hr/payroll.generated',
                data: {
                    payrollIds,
                    unitId,
                    slug: params.slug
                }
            });
        }

		return { success: true, message: `Payroll ${month}/${year} berhasil dibuat untuk ${employees.length} karyawan. Notifikasi WA sedang dikirim di background.` };
	},

	markPaid: async ({ params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return { success: false, message: 'Sesi berakhir' };

		const unitList = await db.select({ id: schema.unitBisnis.id }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));
		if (!unitList.length) return { success: false, message: 'Unit tidak ditemukan' };
        const unit = unitList[0];

		const { month, year } = thisMonthWIB();
        const emps = await db.select({ id: schema.employees.id }).from(schema.employees).where(eq(schema.employees.companyId, unit.id));
        const empIds = emps.map(e => e.id);
        
        if (empIds.length > 0) {
            // Get unpaid payrolls for this month
            const unpaidPayrolls = await db.select().from(schema.payrolls)
                .where(and(
                    inArray(schema.payrolls.employeeId, empIds), 
                    eq(schema.payrolls.periodMonth, month), 
                    eq(schema.payrolls.periodYear, year),
                    eq(schema.payrolls.paymentStatus, 'unpaid')
                ));
                
            if (unpaidPayrolls.length > 0) {
                // Calculate total net pay
                const totalNetPay = unpaidPayrolls.reduce((sum, p) => sum + Number(p.netPay || 0), 0);
                
                // Update payrolls to paid
                await db.update(schema.payrolls)
                    .set({ paymentStatus: 'paid' })
                    .where(and(
                        inArray(schema.payrolls.employeeId, empIds), 
                        eq(schema.payrolls.periodMonth, month), 
                        eq(schema.payrolls.periodYear, year)
                    ));

                // ── INTEGRASI BUKU BESAR (JURNAL UMUM) ──
                if (totalNetPay > 0) {
                    const { todayStrWIB } = await import('$lib/server/dateUtils');
                    const nowWIB = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
                    const tanggalJurnal = nowWIB();

                    // Find Kas account
                    const akunKasArr = await db.select().from(schema.chartOfAccounts).where(and(eq(schema.chartOfAccounts.unitId, unit.id), eq(schema.chartOfAccounts.tipeAkun, 'ASET_LANCAR'))).limit(1);
                    const akunBebanArr = await db.select().from(schema.chartOfAccounts).where(and(eq(schema.chartOfAccounts.unitId, unit.id), eq(schema.chartOfAccounts.tipeAkun, 'BEBAN_OPERASIONAL'))).limit(1);
                    
                    if (akunKasArr.length > 0 && akunBebanArr.length > 0) {
                        const akunKas = akunKasArr[0];
                        const akunBeban = akunBebanArr[0];

                        // Create Journal Header
                        const [jurnalResult] = await db.insert(schema.journalEntries).values({
                            unitId: unit.id,
                            userId: String(userId),
                            tanggal: tanggalJurnal,
                            nomorJurnal: `JRN-PAY-${Date.now()}`,
                            referensi: `Payroll ${month}/${year}`,
                            memo: `Pembayaran Gaji Karyawan Bulan ${month}/${year}`,
                            sourceType: 'PAYROLL',
                            sourceId: `${month}-${year}`,
                            totalDebit: String(totalNetPay),
                            totalKredit: String(totalNetPay),
                            status: 'POSTED',
                            createdAt: tanggalJurnal
                        });

                        const journalId = jurnalResult.insertId;

                        // Line 1: Debit Beban Gaji
                        await db.insert(schema.journalEntryLines).values({
                            journalId: journalId,
                            coaId: akunBeban.id,
                            deskripsi: `Beban Gaji ${month}/${year}`,
                            debit: String(totalNetPay),
                            kredit: '0'
                        });

                        // Line 2: Kredit Kas
                        await db.insert(schema.journalEntryLines).values({
                            journalId: journalId,
                            coaId: akunKas.id,
                            deskripsi: `Pembayaran Gaji ${month}/${year}`,
                            debit: '0',
                            kredit: String(totalNetPay)
                        });
                    }
                }
            }
        }
		return { success: true, message: 'Semua payroll bulan ini ditandai lunas dan jurnal akuntansi telah dibuat.' };
	}
};
