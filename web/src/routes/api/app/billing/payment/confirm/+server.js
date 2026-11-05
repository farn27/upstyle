import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { checkTransactionStatus, parseTransactionStatus, PLAN_PRICES } from '$lib/server/payment';
import { aktifkanPaket, bacaOrderId } from '$lib/server/billing';
import { log } from '$lib/server/logger';

/**
 * POST /api/app/billing/payment/confirm  body: { sessionId: order_id dari /billing/upgrade }
 * Cek status ke Midtrans. Kalau lunas tapi webhook belum masuk, paket langsung diaktifkan (idempoten).
 */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	let body;
	try { body = await request.json(); } catch { body = {}; }
	const orderId = String(body?.sessionId || '');
	const order = bacaOrderId(orderId);
	// order_id memuat userId — hanya pemilik transaksi yang boleh mengonfirmasi
	if (!order || order.userId !== userId) return json({ success: false, message: 'Transaksi tidak ditemukan' }, { status: 404 });
	try {
		const status = parseTransactionStatus(await checkTransactionStatus(orderId));
		if (status === 'success') await aktifkanPaket(db, userId, order.planId);
		return json({
			success: status === 'success',
			message: status === 'success' ? 'Pembayaran berhasil, paket aktif' : status === 'pending' ? 'Pembayaran belum selesai' : 'Pembayaran tidak berhasil',
			data: {
				transactionId: orderId,
				status: status === 'success' ? 'success' : status === 'pending' ? 'pending' : 'failed',
				planId: order.planId,
				amount: PLAN_PRICES[/** @type {'pro' | 'enterprise'} */ (order.planId)].amount,
				currency: 'IDR',
				message: '',
				paidAt: status === 'success' ? new Date().toISOString() : ''
			}
		});
	} catch (err) {
		log.api.error({ err: err instanceof Error ? err.message : 'error' }, 'POST app/billing/payment/confirm');
		return json({ success: false, message: 'Gagal mengecek status pembayaran' }, { status: 502 });
	}
}
