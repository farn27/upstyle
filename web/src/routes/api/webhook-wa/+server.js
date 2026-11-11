import { env } from '$env/dynamic/private';
import { db } from '$lib/server/drizzle';
import crypto from 'crypto';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { uraikanTransaksi } from '$lib/server/aiTransaksi';
import { catatTransaksi, pastikanCoaStandar } from '$lib/server/catatTransaksi';
import { tandaiBerubah } from '$lib/server/cacheVersi';
import { triggerEvent } from '$lib/server/pusher';
import { apiError, apiSuccess, apiRateLimit } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, WA_WEBHOOK_LIMIT } from '$lib/server/rateLimit';
import { waWebhookSchema } from '$lib/server/validation';
import { log } from '$lib/server/logger';

export const POST = async ({ request }) => {
	// ─── 1. Autentikasi Webhook (WAJIB) ──────────────────────────────────────
	const webhookSecret = env.WA_WEBHOOK_SECRET;
	if (!webhookSecret) {
		log.api.error({}, '[WA Webhook] WA_WEBHOOK_SECRET tidak dikonfigurasi di .env!');
		return apiError(
			'Webhook belum dikonfigurasi dengan benar di server',
			503,
			'WEBHOOK_NOT_CONFIGURED'
		);
	}

	const providedSecret = request.headers.get('x-webhook-secret');
	const a = Buffer.from(String(providedSecret || ''));
	const b = Buffer.from(webhookSecret);
	if (!providedSecret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
		return apiError('Webhook secret tidak valid', 401, 'INVALID_WEBHOOK_SECRET');
	}

	// ─── 2. Rate Limit per IP ─────────────────────────────────────────────────
	const ip = getClientIP(request);
	const rl = await checkRateLimit({
		key: ip,
		prefix: 'rl:webhook-wa:ip',
		...WA_WEBHOOK_LIMIT
	});
	if (!rl.allowed) {
		return apiRateLimit(rl.retryAfter);
	}

	// ─── 3. Parse & Validasi Body ─────────────────────────────────────────────
	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Request body harus berformat JSON', 400, 'INVALID_JSON');
	}

	const parsed = waWebhookSchema.safeParse(body);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message || 'Input tidak valid';
		return apiError(firstError, 422, 'VALIDATION_ERROR');
	}

	const { message, userId, unitId } = parsed.data;

	// ─── 4. Verifikasi userId + unitId ada & milik user yang benar ────────────
	try {
		const unitRows = await db.select({ id: unitBisnis.id })
			.from(unitBisnis)
			.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
			.limit(1);
		if (unitRows.length === 0) {
			return apiError('unitId atau userId tidak valid', 403, 'FORBIDDEN');
		}
	} catch (err) {
		log.api.error({ err }, '[WA Webhook] DB verify error');
		return apiError('Terjadi kesalahan server', 500, 'SERVER_ERROR');
	}

	// ─── 5. Urai pesan & catat (sama dengan form entri web & aplikasi mobile) ──
	// Dulu: kategori ABC lama, tanpa jurnal, stok dikurangi di luar transaksi DB, tanggal NOW() (UTC).
	try {
		// Unit yang belum punya COA diberi COA standar dulu supaya akun hasil uraian tidak kosong
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, unitId));
		const h = await uraikanTransaksi(db, unitId, message);
		if (!(h.nominal > 0)) {
			return apiError('Nominal transaksi tidak ditemukan di pesan', 422, 'AI_PROCESSING_FAILED');
		}
		const hasil = await db.transaction(async (/** @type {any} */ tx) => {
			return catatTransaksi(tx, {
				unitId,
				userId,
				kategori: h.kategori,
				nominal: h.nominal,
				keterangan: h.catatan,
				coaId: h.coa_id,
				kasCoaId: h.kas_coa_id,
				productId: h.product_id,
				qty: h.qty
			});
		});
		const slugRow = await db.select({ slug: unitBisnis.slug }).from(unitBisnis).where(eq(unitBisnis.id, unitId)).limit(1);
		await tandaiBerubah({ userId, slug: slugRow[0]?.slug ?? null });
		await Promise.allSettled([
			triggerEvent(`unit-${unitId}`, 'stats-updated', { unitId, triggerRefresh: true }),
			h.product_id ? triggerEvent(`unit-${unitId}`, 'stock-updated', { unitId }) : Promise.resolve()
		]);

		return apiSuccess({ catatan: h.catatan, nominal: h.nominal, kategori: hasil.kategori, trxId: hasil.trxId }, 'Tercatat Otomatis!');
	} catch (err) {
		if (err instanceof Error && err.name === 'TransaksiError') {
			return apiError(err.message, /** @type {any} */ (err).status || 422, 'TRANSAKSI_DITOLAK');
		}
		log.api.error({ err }, '[WA Webhook] Processing error');
		return apiError('Terjadi kesalahan saat memproses pesan', 500, 'SERVER_ERROR');
	}
};
