/**
 * POST /api/payment/webhook
 * Menerima notifikasi pembayaran dari Midtrans.
 * Daftarkan URL ini di Midtrans Dashboard → Settings → Payment Notification URL
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users, riwayatAksi, unitBisnis } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, parseTransactionStatus } from '$lib/server/payment';
import { checkRateLimit, getClientIP } from '$lib/server/rateLimit';
import { log } from '$lib/server/logger.js';

export async function POST({ request }) {
	// Rate limit webhook
	const ip = getClientIP(request);
	const rl = await checkRateLimit({
		key: ip,
		prefix: 'rl:payment-webhook',
		limit: 100,
		windowSec: 60
	});
	if (!rl.allowed) {
		return json({ error: 'Rate limit exceeded' }, { status: 429 });
	}

	let notification;
	try {
		notification = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	// Verifikasi signature Midtrans
	if (!verifyWebhookSignature(notification)) {
		log.api.warn({ orderId: notification?.order_id }, 'PaymentWebhook: Invalid signature');
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	const status = parseTransactionStatus(notification);
	const orderId = notification.order_id;

	// Parse order ID: format UPSTYLE-{PLAN}-{USER_ID}-{TIMESTAMP}
	const parts = String(orderId).split('-');
	// parts[0] = UPSTYLE, parts[1] = PLAN, parts[2] = USER_ID
	if (parts.length < 3 || parts[0] !== 'UPSTYLE') {
		log.api.warn({ orderId }, 'PaymentWebhook: Unknown order format');
		return json({ ok: true });
	}

	const planId = parts[1]?.toLowerCase();
	const userId = Number(parts[2]);

	if (!planId || !userId) {
		return json({ ok: true });
	}

	try {
		if (status === 'success') {
			// Upgrade plan user
			const validPlans = ['pro', 'enterprise'];
			if (!validPlans.includes(planId)) {
				log.api.error({ planId, orderId }, 'PaymentWebhook: Invalid planId in order');
				return json({ ok: true });
			}

			await db.update(users).set({ role: planId }).where(eq(users.id, userId));

			// Catat di riwayat
			const userUnits = await db.select({ id: unitBisnis.id })
				.from(unitBisnis)
				.where(eq(unitBisnis.userId, userId))
				.orderBy(unitBisnis.id)
				.limit(1);
			const minUnitId = userUnits.length > 0 ? userUnits[0].id : 0;
			
			db.insert(riwayatAksi).values({
				userId: userId,
				unitId: minUnitId,
				pesan: `Upgrade ke paket ${planId.toUpperCase()} berhasil`,
				tipe: 'success',
				kategori: 'billing'
			}).catch(() => {}); // Non-blocking

			log.api.info({ userId, planId, orderId }, 'PaymentWebhook: User upgraded');
		} else if (status === 'failed' || status === 'expired') {
			log.api.info({ status, orderId }, 'PaymentWebhook: Payment not completed');
		}
	} catch (err) {
		log.api.error({ err: err.message, orderId }, 'PaymentWebhook: DB error');
		// Return 200 agar Midtrans tidak retry terus
	}

	return json({ ok: true });
}
