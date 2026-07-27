/**
 * Budget & Target Tracker
 * Set target pendapatan/pengeluaran bulanan, track progress real-time
 */
import { db } from '$lib/server/drizzle';
import { unitBisnis, budgetItems, chartOfAccounts, transaksi } from '$lib/server/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { z } from 'zod';
import { thisMonthWIB } from '$lib/server/dateUtils';

const budgetSchema = z.object({
	coaLabel: z.string().min(1).max(100),
	tahun: z.coerce.number().int().min(2020).max(2099),
	bulan: z.coerce.number().int().min(0).max(12),
	nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
	keterangan: z.string().max(255).optional()
});

export async function load({ params, url, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Login diperlukan');

	const unitRows = await db.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)))
		.limit(1);
	if (!unitRows.length) throw error(404, 'Unit tidak ditemukan');
	const unit = unitRows[0];

	const { year: wibYear, month: wibMonth } = thisMonthWIB();
	const tahun = parseInt(url.searchParams.get('tahun') || wibYear);
	const bulan = parseInt(url.searchParams.get('bulan') || wibMonth);

	// Budget yang sudah diset
	const budgets = await db.select({
		id: budgetItems.id,
		unit_id: budgetItems.unitId,
		coa_id: budgetItems.coaId,
		tahun: budgetItems.tahun,
		bulan: budgetItems.bulan,
		nominal: budgetItems.nominal,
		keterangan: budgetItems.keterangan,
		created_at: budgetItems.createdAt,
		nama_akun: chartOfAccounts.namaAkun,
		tipe_akun: chartOfAccounts.tipeAkun
	}).from(budgetItems)
	  .leftJoin(chartOfAccounts, eq(chartOfAccounts.id, budgetItems.coaId))
	  .where(and(eq(budgetItems.unitId, unit.id), eq(budgetItems.tahun, tahun)))
	  .orderBy(asc(budgetItems.bulan), asc(chartOfAccounts.kodeAkun));

	// Realisasi bulan ini dari transaksi
	const realisasi = await db.select({
		total_masuk: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%' THEN ${transaksi.nominal} ELSE 0 END)`,
		total_keluar: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%keluar%' THEN ${transaksi.nominal} ELSE 0 END)`
	}).from(transaksi)
	  .where(and(eq(transaksi.unitId, unit.id), sql`YEAR(${transaksi.tanggal}) = ${tahun}`, sql`MONTH(${transaksi.tanggal}) = ${bulan}`));

	// Realisasi per bulan (12 bulan)
	const realisasiPerBulan = await db.select({
		bulan: sql`MONTH(${transaksi.tanggal})`,
		masuk: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%' THEN ${transaksi.nominal} ELSE 0 END)`,
		keluar: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%keluar%' THEN ${transaksi.nominal} ELSE 0 END)`
	}).from(transaksi)
	  .where(and(eq(transaksi.unitId, unit.id), sql`YEAR(${transaksi.tanggal}) = ${tahun}`))
	  .groupBy(sql`MONTH(${transaksi.tanggal})`)
	  .orderBy(sql`MONTH(${transaksi.tanggal})`);

	// COA list untuk dropdown
	const coaList = await db.select({
		id: chartOfAccounts.id,
		kode_akun: chartOfAccounts.kodeAkun,
		nama_akun: chartOfAccounts.namaAkun,
		tipe_akun: chartOfAccounts.tipeAkun
	}).from(chartOfAccounts)
	  .where(and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.isActive, 1)))
	  .orderBy(asc(chartOfAccounts.kodeAkun));

	// Hitung progress per budget
	const realisasiMap = {};
	realisasiPerBulan.forEach((r) => {
		realisasiMap[r.bulan] = { masuk: Number(r.masuk), keluar: Number(r.keluar) };
	});

	const budgetsWithProgress = budgets.map((b) => {
		const real = realisasiMap[b.bulan] || { masuk: 0, keluar: 0 };
		const isIncome = ['PENDAPATAN', 'PENDAPATAN_LAINNYA'].includes(b.tipe_akun);
		const realisasiNominal = isIncome ? real.masuk : real.keluar;
		const progress = b.nominal > 0 ? Math.min((realisasiNominal / Number(b.nominal)) * 100, 150) : 0;
		return {
			...b,
			nominal: Number(b.nominal),
			realisasi: realisasiNominal,
			progress: Math.round(progress),
			selisih: realisasiNominal - Number(b.nominal),
			isOverBudget: realisasiNominal > Number(b.nominal)
		};
	});

	// Summary total budget vs realisasi bulan ini
	const totalBudgetMasuk = budgets
		.filter((b) => b.bulan === bulan && ['PENDAPATAN', 'PENDAPATAN_LAINNYA'].includes(b.tipe_akun))
		.reduce((s, b) => s + Number(b.nominal), 0);
	const totalBudgetKeluar = budgets
		.filter((b) => b.bulan === bulan && !['PENDAPATAN', 'PENDAPATAN_LAINNYA'].includes(b.tipe_akun))
		.reduce((s, b) => s + Number(b.nominal), 0);

	return {
		unit,
		tahun,
		bulan,
		budgets: budgetsWithProgress,
		coaList,
		realisasiPerBulan,
		summary: {
			totalMasuk: Number(realisasi[0]?.total_masuk || 0),
			totalKeluar: Number(realisasi[0]?.total_keluar || 0),
			budgetMasuk: totalBudgetMasuk,
			budgetKeluar: totalBudgetKeluar
		}
	};
}

export const actions = {
	saveBudget: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Login diperlukan' });

		const unitRows = await db.select({ id: unitBisnis.id })
			.from(unitBisnis)
			.where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)))
			.limit(1);
		if (!unitRows.length) return fail(404, { message: 'Unit tidak ditemukan' });
		const unitId = unitRows[0].id;

		const data = await request.formData();
		const raw = {
			coaLabel: data.get('coaLabel'),
			tahun: data.get('tahun'),
			bulan: data.get('bulan'),
			nominal: data.get('nominal'),
			keterangan: data.get('keterangan')
		};

		const parsed = budgetSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message });

		const coaId = parseInt(data.get('coaId') || '0') || null;

		try {
			// Upsert: update jika sudah ada, insert jika belum
			if (coaId) {
				await db.insert(budgetItems).values({
					unitId: unitId,
					coaId: coaId,
					tahun: parsed.data.tahun,
					bulan: parsed.data.bulan,
					nominal: String(parsed.data.nominal),
					keterangan: parsed.data.keterangan || null
				}).onDuplicateKeyUpdate({ set: { nominal: sql`VALUES(nominal)`, keterangan: sql`VALUES(keterangan)` } });
			} else {
				// Tanpa COA — simpan dengan label saja
				await db.insert(budgetItems).values({
					unitId: unitId,
					tahun: parsed.data.tahun,
					bulan: parsed.data.bulan,
					nominal: String(parsed.data.nominal),
					keterangan: parsed.data.coaLabel,
					coaId: 0 // Default value for non-null constraint
				}).onDuplicateKeyUpdate({ set: { nominal: sql`VALUES(nominal)`, keterangan: sql`VALUES(keterangan)` } });
			}
			return { success: true, message: 'Budget berhasil disimpan' };
		} catch (err) {
			console.error('[Budget] Error:', err);
			return fail(500, { message: 'Gagal menyimpan budget' });
		}
	},

	deleteBudget: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const unitRows = await db.select({ id: unitBisnis.id })
			.from(unitBisnis)
			.where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)))
			.limit(1);
		if (!unitRows.length) return fail(404, { message: 'Unit tidak ditemukan' });

		const data = await request.formData();
		const id = parseInt(String(data.get('id')));
		if (!id) return fail(400, { message: 'ID tidak valid' });

		await db.delete(budgetItems)
			.where(and(eq(budgetItems.id, id), eq(budgetItems.unitId, unitRows[0].id)));
		return { success: true };
	}
};
