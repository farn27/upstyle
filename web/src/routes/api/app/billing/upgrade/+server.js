import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { createSnapTransaction, PLAN_PRICES } from '$lib/server/payment';
import { paketDariRole } from '$lib/server/billing';
import { log } from '$lib/server/logger';

/**
 * POST /api/app/billing/upgrade  body: { planId: 'pro' | 'enterprise' }
 * Sama dengan /api/payment/snap di web: buat transaksi Midtrans Snap.
 * App membuka redirectUrl; paket naik otomatis lewat webhook (atau /billing/payment/confirm).
 */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	let body;
	try { body = await request.json(); } catch { return json({ success: false, message: 'Request body harus JSON' }, { status: 400 }); }
	const planId = String(body?.planId || '').toLowerCase();
	if (!['pro', 'enterprise'].includes(planId)) {
		return json({ success: false, message: 'planId tidak valid. Pilih: pro atau enterprise' }, { status: 422 });
	}
	try {
		const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { username: true, email: true, role: true } });
		if (!user) return json({ success: false, message: 'User tidak ditemukan' }, { status: 401 });
		const sekarang = paketDariRole(user.role);
		if (sekarang === planId) return json({ success: false, message: 'Kamu sudah berlangganan paket ini' }, { status: 400 });
		if (sekarang === 'enterprise' && planId === 'pro') {
			return json({ success: false, message: 'Tidak bisa downgrade via sistem ini. Hubungi support.' }, { status: 400 });
		}
		const snap = await createSnapTransaction({ userId, userEmail: user.email, username: user.username, planId: /** @type {'pro' | 'enterprise'} */ (planId) });
		return json({
			success: true,
			message: 'Lanjutkan pembayaran di halaman Midtrans',
			data: {
				sessionId: snap.order_id,
				token: snap.token,
				snapToken: snap.token,
				redirectUrl: snap.redirect_url,
				amount: PLAN_PRICES[/** @type {'pro' | 'enterprise'} */ (planId)].amount,
				currency: 'IDR',
				expiresAt: ''
			}
		});
	} catch (err) {
		log.api.error({ err: err instanceof Error ? err.message : 'error' }, 'POST app/billing/upgrade');
		return json({ success: false, message: 'Gagal membuat transaksi pembayaran' }, { status: 500 });
	}
}
