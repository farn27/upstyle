/**
 * GET /api/export/produk?unitId=X&format=excel
 */
import { db } from '$lib/server/drizzle';
import { products, unitBisnis, kategoriProduk } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiUnauthorized, apiError } from '$lib/server/apiResponse';
import { exportProdukExcel } from '$lib/server/excelExport.js';

export async function GET({ url, cookies }) {
  const userId = await getCurrentUserId(cookies);
  if (!userId) return apiUnauthorized();

  const unitId = parseInt(url.searchParams.get('unitId') || '0');
  if (!unitId) return apiError('unitId wajib', 400);

  const [unit] = await db.select({ id: unitBisnis.id, namaUnit: unitBisnis.namaUnit })
    .from(unitBisnis)
    .where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
    .limit(1);
  if (!unit) return apiError('Unit tidak ditemukan', 404);

  const productList = await db.select({
    id: products.id, sku: products.sku, nama: products.nama,
    hargaBeli: products.hargaBeli, hargaJual: products.hargaJual,
    stok: products.stok, minStok: products.minStok, status: products.status,
    kategori: kategoriProduk.namaKategori,
  })
    .from(products)
    .leftJoin(kategoriProduk, eq(kategoriProduk.id, products.kategoriId))
    .where(and(eq(products.unitId, unitId), isNull(products.deletedAt)));

  const buffer = await exportProdukExcel({ unitName: unit.namaUnit, products: productList });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="produk-${unit.namaUnit}-${Date.now()}.xlsx"`,
    },
  });
}
