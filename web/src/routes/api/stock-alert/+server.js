/**
 * POST /api/stock-alert
 * Trigger cek stok menipis untuk unit tertentu.
 * Dipanggil dari dashboard atau background job.
 */
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { checkAndAlertLowStock } from '$lib/server/stockAlert';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
	unitId: z.coerce.number().int().positive(),
	unitName: z.string().optional()
});

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	let body;
	try { body = await request.json(); } catch { return apiError('Invalid JSON', 400); }

	const parsed = schema.safeParse(body);
	if (!parsed.success) return apiError('unitId wajib diisi', 422);

	const { unitId, unitName } = parsed.data;

	// Verifikasi unit milik user
	const rows = await db.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
		.limit(1);
	if (!rows.length) return apiError('Unit tidak ditemukan', 404);

	const result = await checkAndAlertLowStock(unitId, userId, unitName || rows[0].nama_unit);
	return apiSuccess(result, 'Stok alert diproses');
}
