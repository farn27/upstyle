import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { bacaBase64, bacaBarisFile, imporProduk, imporPelanggan, ImporEksporError } from '$lib/server/imporEkspor';
import { bersihkanCacheProduk } from '$lib/server/produkMassal';
import { redis } from '$lib/server/redis';

/**
 * POST /api/app/import  body: { unitId, dataType: products|customers, fileBase64, fileName }
 * File .xlsx / .csv (maks 5 MB, 2000 baris). Kolom sama dengan import produk di web.
 */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
		const dataType = String(body?.dataType || '').toLowerCase();
		const rows = bacaBarisFile(bacaBase64(body?.fileBase64));
		if (rows.length === 0) return json({ success: false, message: 'File kosong atau tidak berisi baris data' }, { status: 400 });

		let hasil;
		if (dataType === 'products') {
			hasil = await imporProduk(db, { userId, unitId, rows });
			await bersihkanCacheProduk(db, redis, unitId);
		} else if (dataType === 'customers') {
			hasil = await imporPelanggan(db, { userId, unitId, rows });
		} else {
			return json({ success: false, message: 'Import hanya untuk products atau customers' }, { status: 422 });
		}
		return json({
			success: hasil.successRows > 0,
			message: `${hasil.successRows} dari ${hasil.totalRows} baris berhasil diimpor`,
			data: { importId: `IMP-${Date.now()}`, ...hasil, completedAt: new Date().toISOString() }
		}, { status: hasil.successRows > 0 ? 200 : 422 });
	} catch (err) {
		if (err instanceof ImporEksporError) return json({ success: false, message: err.message }, { status: err.status });
		log.api.error({ err }, 'POST app/import');
		return json({ success: false, message: 'Gagal import data. Periksa kembali format file.' }, { status: 500 });
	}
}
