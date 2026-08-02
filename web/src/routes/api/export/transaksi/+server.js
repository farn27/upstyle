/**
 * GET /api/export/transaksi?unitId=X&format=excel|pdf&periode=bulan_ini
 * Export data transaksi ke Excel atau PDF
 */
import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiUnauthorized, apiError } from '$lib/server/apiResponse';
import { exportTransaksiExcel } from '$lib/server/excelExport.js';
import { generateLaporanPDF } from '$lib/server/pdfGenerator.js';
import { checkRateLimit, getClientIP, EXPORT_LIMIT } from '$lib/server/rateLimit';

export async function GET({ url, cookies }) {
  const userId = await getCurrentUserId(cookies);
  if (!userId) return apiUnauthorized();

  const ip = getClientIP({ headers: new Headers() });
  const rl = await checkRateLimit({ key: `user:${userId}`, prefix: 'rl:export', ...EXPORT_LIMIT });
  if (!rl.allowed) return new Response('Rate limit exceeded', { status: 429 });

  const unitId = parseInt(url.searchParams.get('unitId') || '0');
  const format = url.searchParams.get('format') || 'excel';
  const periode = url.searchParams.get('periode') || '';

  if (!unitId) return apiError('unitId wajib', 400);

  // Verifikasi ownership
  const [unit] = await db.select({ id: unitBisnis.id, namaUnit: unitBisnis.namaUnit })
    .from(unitBisnis)
    .where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
    .limit(1);
  if (!unit) return apiError('Unit tidak ditemukan', 404);

  // Ambil transaksi
  const txList = await db.select()
    .from(transaksi)
    .where(eq(transaksi.unitId, unitId))
    .orderBy(desc(transaksi.tanggal))
    .limit(1000);

  const transactions = txList.map(t => ({
    ...t,
    nominal: Number(t.nominal || 0),
    tanggal: t.tanggal || new Date().toISOString(),
  }));

  const totalMasuk = transactions.filter(t => t.kategoriTrx === 'MASUK').reduce((s, t) => s + t.nominal, 0);
  const totalKeluar = transactions.filter(t => t.kategoriTrx === 'KELUAR').reduce((s, t) => s + t.nominal, 0);

  if (format === 'pdf') {
    const pdfBytes = await generateLaporanPDF({
      unitName: unit.namaUnit,
      periode,
      masuk: totalMasuk,
      keluar: totalKeluar,
      laba: totalMasuk - totalKeluar,
      transactions,
    });

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-${unit.namaUnit}-${Date.now()}.pdf"`,
      },
    });
  }

  // Default: Excel
  const buffer = await exportTransaksiExcel({
    unitName: unit.namaUnit,
    transactions,
    periode,
  });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="transaksi-${unit.namaUnit}-${Date.now()}.xlsx"`,
    },
  });
}
