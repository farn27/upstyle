import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import { rollbackOperasiMassal, bersihkanCacheProduk, MassalError } from '$lib/server/produkMassal';

/** POST /api/app/products/bulk/rollback?unitId=X  body: { operationId } — berlaku 24 jam */
export async function POST({ url, request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		const unitId = Number(url.searchParams.get('unitId') || body?.unitId);
		if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

		const { restored } = await rollbackOperasiMassal(db, redis, {
			userId,
			unitId,
			operationId: String(body?.operationId || '')
		});
		await bersihkanCacheProduk(db, redis, unitId);
		return json({ success: true, message: `${restored} produk dikembalikan`, data: { restored } });
	} catch (err) {
		if (err instanceof MassalError) return json({ success: false, message: pesanAman(err) }, { status: err.status });
		log.api.error({ err }, 'POST products/bulk/rollback');
		return json({ success: false, message: 'Gagal rollback edit massal' }, { status: 500 });
	}
}
