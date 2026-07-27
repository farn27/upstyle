/**
 * POST /api/laporan-wa
 * Generate ringkasan keuangan harian/mingguan dalam format teks WA
 * Returns teks siap kirim + bisa dipakai webhook WA
 */
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { unitBisnis, transaksi, posOrders, posOrderItems, products } from '$lib/server/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { todayStrWIB, thisMonthWIB, formatMonthID } from '$lib/server/dateUtils';

const schema = z.object({
	unitId: z.coerce.number().int().positive(),
	periode: z.enum(['hari_ini', 'kemarin', 'minggu_ini', 'bulan_ini']).default('hari_ini')
});

const idr = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const pct = (now, prev) => {
	if (!prev || prev === 0) return null;
	const p = ((now - prev) / prev) * 100;
	return (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
};

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	let body;
	try { body = await request.json(); } catch { return apiError('Invalid JSON', 400); }

	const parsed = schema.safeParse(body);
	if (!parsed.success) return apiError(parsed.error.errors[0]?.message, 422);

	const { unitId, periode } = parsed.data;

	const unitRows = await db.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
		.limit(1);
	if (!unitRows.length) return apiError('Unit tidak ditemukan', 404);
	const unit = unitRows[0];

	// Tentukan range tanggal — semua pakai CURDATE() MySQL (ikut timezone drizzle +07:00)
	// periodeLabel pakai WIB helper
	let dateFilter = '';
	let prevFilter = '';
	let periodeLabel = '';

	const { year: wibYear, month: wibMonth } = thisMonthWIB();
	const todayWIB = todayStrWIB(); // YYYY-MM-DD WIB

	if (periode === 'hari_ini') {
		dateFilter = `DATE(tanggal) = CURDATE()`;
		prevFilter = `DATE(tanggal) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
		// Format tanggal WIB untuk label
		const [y, m, d] = todayWIB.split('-');
		const bulanNames = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
		periodeLabel = `Hari Ini (${parseInt(d)} ${bulanNames[parseInt(m)]})`;
	} else if (periode === 'kemarin') {
		dateFilter = `DATE(tanggal) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
		prevFilter = `DATE(tanggal) = DATE_SUB(CURDATE(), INTERVAL 2 DAY)`;
		periodeLabel = 'Kemarin';
	} else if (periode === 'minggu_ini') {
		dateFilter = `YEARWEEK(tanggal, 1) = YEARWEEK(CURDATE(), 1)`;
		prevFilter = `YEARWEEK(tanggal, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 1)`;
		periodeLabel = 'Minggu Ini';
	} else {
		dateFilter = `YEAR(tanggal) = YEAR(CURDATE()) AND MONTH(tanggal) = MONTH(CURDATE())`;
		prevFilter = `YEAR(tanggal) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(tanggal) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`;
		periodeLabel = `Bulan ${formatMonthID(wibYear, wibMonth)}`;
	}

	const summary = await db.select({
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END)`,
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`,
			total_trx: sql`COUNT(*)`
		})
		.from(transaksi)
		.where(and(eq(transaksi.unitId, unitId), sql.raw(dateFilter)));

	const prevSummary = await db.select({
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END)`,
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`
		})
		.from(transaksi)
		.where(and(eq(transaksi.unitId, unitId), sql.raw(prevFilter)));

	// POS summary
	const posSummary = await db.select({
			total_order: sql`COUNT(*)`,
			total_omzet: sql`SUM(${posOrders.total})`
		})
		.from(posOrders)
		.where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID'), sql.raw(dateFilter.replace('tanggal', 'created_at'))));

	// Top 3 produk hari ini
	const topProduk = await db.select({
			nama: products.nama,
			qty: sql`SUM(${posOrderItems.qty})`,
			revenue: sql`SUM(${posOrderItems.total})`
		})
		.from(posOrderItems)
		.innerJoin(posOrders, eq(posOrders.id, posOrderItems.orderId))
		.innerJoin(products, eq(products.id, posOrderItems.productId))
		.where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID'), sql.raw(dateFilter.replace('tanggal', 'pos_orders.created_at'))))
		.groupBy(posOrderItems.productId, products.nama)
		.orderBy(desc(sql`revenue`))
		.limit(3);

	const masuk = Number(summary[0]?.masuk || 0);
	const keluar = Number(summary[0]?.keluar || 0);
	const laba = masuk - keluar;
	const totalTrx = Number(summary[0]?.total_trx || 0);
	const prevMasuk = Number(prevSummary[0]?.masuk || 0);
	const prevKeluar = Number(prevSummary[0]?.keluar || 0);
	const totalOrder = Number(posSummary[0]?.total_order || 0);
	const totalOmzet = Number(posSummary[0]?.total_omzet || 0);

	const perubahan = pct(masuk, prevMasuk);
	const emojiTrend = laba >= 0 ? '📈' : '📉';
	const emojiStatus = laba > 0 ? '✅' : laba === 0 ? '⚖️' : '⚠️';

	// Format teks WA
	let teks = `*📊 LAPORAN ${periodeLabel.toUpperCase()}*\n`;
	teks += `_${unit.nama_unit}_\n`;
	teks += `━━━━━━━━━━━━━━━━━━━━\n\n`;

	teks += `💰 *KEUANGAN*\n`;
	teks += `✅ Pemasukan: *${idr(masuk)}*`;
	if (perubahan) teks += ` (${perubahan} vs sebelumnya)`;
	teks += `\n`;
	teks += `❌ Pengeluaran: *${idr(keluar)}*\n`;
	teks += `${emojiStatus} Laba/Rugi: *${idr(laba)}*\n`;
	teks += `📝 Transaksi: ${totalTrx} entri\n\n`;

	if (totalOrder > 0) {
		teks += `🛒 *POS / KASIR*\n`;
		teks += `Pesanan: ${totalOrder} order\n`;
		teks += `Omzet: *${idr(totalOmzet)}*\n\n`;
	}

	if (topProduk.length > 0) {
		teks += `🏆 *TOP PRODUK*\n`;
		topProduk.forEach((p, i) => {
			teks += `${i + 1}. ${p.nama} — ${p.qty}x (${idr(p.revenue)})\n`;
		});
		teks += `\n`;
	}

	teks += `${emojiTrend} *RINGKASAN*\n`;
	if (laba > 0) {
		teks += `Bisnis dalam kondisi *PROFIT* hari ini. Pertahankan! 💪\n`;
	} else if (laba < 0) {
		teks += `Pengeluaran melebihi pemasukan. Perlu evaluasi. 🔍\n`;
	} else {
		teks += `Pemasukan = Pengeluaran. Cek transaksi yang belum tercatat.\n`;
	}

	teks += `\n_Dikirim otomatis oleh Upstyle_`;

	return apiSuccess({
		teks,
		data: {
			masuk, keluar, laba, totalTrx,
			totalOrder, totalOmzet,
			topProduk,
			periode: periodeLabel
		}
	}, 'Laporan berhasil dibuat');
}
