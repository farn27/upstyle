/**
 * API: AI Transaction Entry Parser
 * POST /api/app/ai-entry
 * Body: { unitId: number, teksInput: string }
 * Returns: { success, data: { hasil: { product_id, qty, kategori, coa_id, kas_coa_id, nominal, catatan } } }
 *
 * Memproses teks natural language transaksi dan mengembalikan data terstruktur
 * lewat lib/server/aiTransaksi.js (sama dengan form entri web).
 */
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { uraikanTransaksi } from '$lib/server/aiTransaksi';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import { cekKuotaAI } from '$lib/server/rateLimit';

const schema = z.object({
	unitId: z.coerce.number().int().positive(),
	teksInput: z.string().min(5, 'Teks terlalu pendek').max(500, 'Teks terlalu panjang')
});

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	const kuota = await cekKuotaAI(userId);
	if (!kuota.allowed) return new Response(JSON.stringify({ success: false, message: kuota.pesan, code: 'AI_RATE_LIMITED' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(kuota.retryAfter) } });

	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Invalid JSON', 400);
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		const msg =
			parsed.error?.issues?.[0]?.message ||
			parsed.error?.errors?.[0]?.message ||
			'Input tidak valid';
		return apiError(msg, 422);
	}

	const { unitId, teksInput } = parsed.data;

	// Verifikasi unit milik user
	const unit = await db.query.unitBisnis.findFirst({
		where: and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId))
	});
	if (!unit) return apiError('Unit tidak ditemukan', 404);

	try {
		const hasil = await uraikanTransaksi(db, Number(unitId), teksInput);
		return apiSuccess(
			{ hasil },
			hasil.sumber === 'ai' ? 'Transaksi berhasil diproses' : 'AI sedang sibuk; data diisi otomatis, mohon dicek'
		);
	} catch (err) {
		log.ai.error({ err: err instanceof Error ? err.message : String(err) }, '[AI Entry] POST /api/app/ai-entry');
		return apiError('Gagal memproses transaksi AI. Coba lagi atau isi manual.', 500);
	}
}
