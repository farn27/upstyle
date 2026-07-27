/**
 * POST /api/ai-kategori
 * Auto-suggest kategori ABC dari teks transaksi (dipanggil saat user mengetik di form entry)
 */
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { suggestKategoriABC } from '$lib/server/aiAdvisor';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { unitBisnis, abcCategories } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
	teks: z.string().min(2).max(300),
	unitId: z.coerce.number().int().positive()
});

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	let body;
	try { body = await request.json(); } catch { return apiError('Invalid JSON', 400); }

	const parsed = schema.safeParse(body);
	if (!parsed.success) return apiError(parsed.error.errors[0]?.message, 422);

	const { teks, unitId } = parsed.data;

	// Verifikasi unit milik user
	const unitRows = await db.select({ id: unitBisnis.id })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
		.limit(1);
	if (!unitRows.length) return apiError('Unit tidak ditemukan', 404);

	const abcRows = await db.select({ id: abcCategories.id, nama_kategori: abcCategories.namaKategori, jenis: abcCategories.jenis })
		.from(abcCategories)
		.orderBy(abcCategories.id);

	try {
		const suggestion = await suggestKategoriABC(teks, abcRows);
		return apiSuccess(suggestion, 'Saran kategori');
	} catch (err) {
		console.error('[AI Kategori]', err);
		return apiError('Gagal menyarankan kategori', 500);
	}
}
