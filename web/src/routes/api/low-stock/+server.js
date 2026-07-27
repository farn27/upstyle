/**
 * GET /api/low-stock?unitId=X
 * Ambil daftar produk stok menipis untuk unit tertentu
 */
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { getLowStockProducts } from '$lib/server/stockAlert';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export async function GET({ url, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	const unitId = parseInt(url.searchParams.get('unitId') || '0');
	if (!unitId) return apiError('unitId diperlukan', 400);

	// Verifikasi ownership
	const rows = await db.select({ id: unitBisnis.id })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
		.limit(1);
	if (!rows.length) return apiError('Unit tidak ditemukan', 404);

	const products = await getLowStockProducts(unitId);
	return apiSuccess(products, 'OK');
}
