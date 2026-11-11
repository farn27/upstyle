/**
 * GET /api/export/transaksi?unitId=X&format=excel|pdf&periode=bulan_ini
 * Export data transaksi ke Excel atau PDF
 */
import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis } from '$lib/server/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiUnauthorized, apiError } from '$lib/server/apiResponse';
import { exportTransaksiExcel } from '$lib/server/excelExport.js';
import { generateLaporanPDF } from '$lib/server/pdfGenerator.js';
import { checkRateLimit, EXPORT_LIMIT } from '$lib/server/rateLimit';

/** @param {string} n */
const namaBerkas = (n) => String(n || 'unit').replace(/[^\w.-]+/g, '_').slice(0, 60);

/**
 * @param {string} periode
 * @param {string | null} start
 * @param {string | null} end
 * @returns {{ mulai: string | null, akhir: string | null, label: string } | null}
 */
export function _rentangPeriode(periode, start, end) {
  return rentangPeriode(periode, start, end);
}

/** @param {string} periode @param {string | null} start @param {string | null} end */
function rentangPeriode(periode, start, end) {
  const tgl = /^\d{4}-\d{2}-\d{2}$/;
  if (start || end) {
    if (!start || !end || !tgl.test(start) || !tgl.test(end) || start > end) return null;
    return { mulai: start, akhir: end, label: `${start} s/d ${end}` };
  }
  const now = new Date(Date.now() + 7 * 3600_000); // WIB
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const akhirBulan = (/** @type {number} */ yy, /** @type {number} */ mm) => `${yy}-${pad(mm)}-${pad(new Date(Date.UTC(yy, mm, 0)).getUTCDate())}`;
  const p = String(periode || 'bulan_ini').toLowerCase();
  if (p === 'semua') return { mulai: null, akhir: null, label: 'Semua periode' };
  if (p === 'bulan_ini') return { mulai: `${y}-${pad(m)}-01`, akhir: akhirBulan(y, m), label: `Bulan ini (${pad(m)}/${y})` };
  if (p === 'bulan_lalu') {
    const yy = m === 1 ? y - 1 : y;
    const mm = m === 1 ? 12 : m - 1;
    return { mulai: `${yy}-${pad(mm)}-01`, akhir: akhirBulan(yy, mm), label: `Bulan lalu (${pad(mm)}/${yy})` };
  }
  if (p === 'tahun_ini') return { mulai: `${y}-01-01`, akhir: `${y}-12-31`, label: `Tahun ${y}` };
  const bulan = /^(\d{4})-(\d{2})$/.exec(p);
  if (bulan && Number(bulan[2]) >= 1 && Number(bulan[2]) <= 12) {
    const yy = Number(bulan[1]);
    const mm = Number(bulan[2]);
    return { mulai: `${yy}-${pad(mm)}-01`, akhir: akhirBulan(yy, mm), label: `${pad(mm)}/${yy}` };
  }
  return null;
}

export async function GET({ url, cookies, request }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

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

  // Periode benar-benar menyaring data (dulu hanya label di judul laporan; isinya selalu 1000 transaksi terakhir)
  const rentang = rentangPeriode(periode, url.searchParams.get('start'), url.searchParams.get('end'));
  if (!rentang) return apiError('Periode tidak valid (bulan_ini, bulan_lalu, tahun_ini, semua, YYYY-MM, atau start & end YYYY-MM-DD)', 400);
  const syarat = [eq(transaksi.unitId, unitId)];
  if (rentang.mulai) syarat.push(gte(transaksi.tanggal, `${rentang.mulai} 00:00:00`));
  if (rentang.akhir) syarat.push(lte(transaksi.tanggal, `${rentang.akhir} 23:59:59`));

  const txList = await db.select()
    .from(transaksi)
    .where(and(...syarat))
    .orderBy(desc(transaksi.tanggal))
    .limit(5000);

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
      periode: rentang.label,
      masuk: totalMasuk,
      keluar: totalKeluar,
      laba: totalMasuk - totalKeluar,
      transactions,
    });

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-${namaBerkas(unit.namaUnit)}-${Date.now()}.pdf"`,
      },
    });
  }

  // Default: Excel
  const buffer = await exportTransaksiExcel({
    unitName: unit.namaUnit,
    transactions,
    periode: rentang.label,
  });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="transaksi-${namaBerkas(unit.namaUnit)}-${Date.now()}.xlsx"`,
    },
  });
}

