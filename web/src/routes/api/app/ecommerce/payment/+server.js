import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { simpanKonfigurasiBayar, TokoError } from '$lib/server/tokoOnline';

/**
 * PUT /api/app/ecommerce/payment — konfigurasi Midtrans (sama dengan web ecommerce/[slug]/integrasi).
 * body: { unitId, midtransClientKey, midtransServerKey, midtransSandbox }
 * Balasan TIDAK pernah berisi server key — hanya serverKeySet: true/false.
 */
export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
		const data = await simpanKonfigurasiBayar(db, unitId, {
			clientKey: body?.midtransClientKey,
			serverKey: body?.midtransServerKey,
			sandbox: body?.midtransSandbox === true || body?.midtransSandbox === 'true'
		});
		return json({ success: true, message: 'Konfigurasi pembayaran disimpan', data });
	} catch (err) {
		if (err instanceof TokoError) return json({ success: false, message: pesanAman(err) }, { status: err.status });
		log.api.error({ err: err instanceof Error ? err.message : 'error' }, 'PUT ecommerce/payment');
		return json({ success: false, message: 'Gagal simpan konfigurasi pembayaran' }, { status: 500 });
	}
}
