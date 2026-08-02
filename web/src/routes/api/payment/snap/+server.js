/**
 * POST /api/payment/snap
 * Buat Snap transaction untuk upgrade plan.
 * Dipanggil dari billing page via fetch.
 */
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { createSnapTransaction, PLAN_PRICES } from '$lib/server/payment';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { log } from '$lib/server/logger';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
	planId: z.enum(['pro', 'enterprise'])
});

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Request body harus JSON', 400, 'INVALID_JSON');
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return apiError('planId tidak valid. Pilih: pro atau enterprise', 422, 'INVALID_PLAN');
	}

	const { planId } = parsed.data;

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { username: true, email: true, role: true }
		});

		if (!user) return apiUnauthorized('User tidak ditemukan');

		// Cek jika sudah plan yang sama atau lebih tinggi
		if (user.role === planId) {
			return apiError('Kamu sudah berlangganan paket ini', 400, 'ALREADY_SUBSCRIBED');
		}
		if (user.role === 'enterprise' && planId === 'pro') {
			return apiError('Tidak bisa downgrade via sistem ini. Hubungi support.', 400, 'DOWNGRADE_NOT_ALLOWED');
		}

		const snapResult = await createSnapTransaction({
			userId,
			userEmail: user.email,
			username: user.username,
			planId
		});

		return apiSuccess(
			{
				token: snapResult.token,
				redirect_url: snapResult.redirect_url,
				plan: PLAN_PRICES[planId]
			},
			'Snap transaction dibuat'
		);
	} catch (err) {
		log.api.error({ err }, '[Payment Snap] Error');
		return apiError('Gagal membuat transaksi pembayaran', 500, 'PAYMENT_ERROR');
	}
}
