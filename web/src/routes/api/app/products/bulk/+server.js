import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import { jalankanOperasiMassal, bersihkanCacheProduk, MassalError } from '$lib/server/produkMassal';

/**
 * POST /api/app/products/bulk?unitId=X
 * body: { type, productIds?, items?: [{ productId, newPrice }], payload? }
 * Detail jenis operasi: lihat $lib/server/produkMassal.js
 */
export async function POST({ url, request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		const unitId = Number(url.searchParams.get('unitId') || body?.unitId);
		if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

		const hasil = await jalankanOperasiMassal(db, redis, {
			userId,
			unitId,
			type: body?.type,
			productIds: Array.isArray(body?.productIds) ? body.productIds : [],
			items: Array.isArray(body?.items) ? body.items : [],
			payload: body?.payload && typeof body.payload === 'object' ? body.payload : {}
		});
		if (hasil.successCount > 0) await bersihkanCacheProduk(db, redis, unitId);

		return json({
			success: hasil.successCount > 0,
			message: `${hasil.successCount} dari ${hasil.totalItems} produk berhasil diproses`,
			data: hasil
		}, { status: hasil.successCount > 0 ? 200 : 404 });
	} catch (err) {
		if (err instanceof MassalError) return json({ success: false, message: err.message }, { status: err.status });
		log.api.error({ err }, 'POST products/bulk');
		return json({ success: false, message: 'Gagal memproses edit massal' }, { status: 500 });
	}
}
