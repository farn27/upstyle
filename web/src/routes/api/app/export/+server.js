import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';
import { signState } from '$lib/server/crypto';
import { log } from '$lib/server/logger';
import { buatFileEkspor, ImporEksporError } from '$lib/server/imporEkspor';

/** Link unduhan berlaku 10 menit */
const MASA_BERLAKU_MS = 10 * 60 * 1000;

/**
 * POST /api/app/export  body: { unitId, dataType: products|finance|customers, format: excel|csv|pdf, startDate?, endDate? }
 * Balasan ExportResult + downloadUrl bertanda tangan (bisa dibuka langsung di browser HP, tanpa token login).
 */
export async function POST({ request, cookies, url }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
		const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, unitId), columns: { namaUnit: true } });
		if (!unit) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });

		const dataType = String(body?.dataType || '').toLowerCase();
		const format = String(body?.format || '').toLowerCase();
		const file = await buatFileEkspor(db, { unitId, unitName: unit.namaUnit, dataType, format, startDate: body?.startDate, endDate: body?.endDate });

		const exportId = `EXP-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
		const token = signState({ u: userId, n: unitId, t: dataType, f: format, s: body?.startDate || null, e: body?.endDate || null, x: Date.now() + MASA_BERLAKU_MS });
		const createdAt = new Date().toISOString();
		const hasil = {
			exportId,
			filePath: '',
			fileName: file.fileName,
			format: format.toUpperCase(),
			recordCount: file.recordCount,
			fileSizeBytes: file.buffer.length,
			downloadUrl: `${url.origin}/api/app/export/download?token=${encodeURIComponent(token)}`,
			createdAt
		};

		if (redis) {
			try {
				const kunci = `export_hist:${unitId}`;
				await redis.lpush(kunci, JSON.stringify({ exportId, fileName: file.fileName, dataType, format: format.toUpperCase(), recordCount: file.recordCount, status: 'completed', createdAt }));
				await redis.ltrim(kunci, 0, 19);
				await redis.expire(kunci, 30 * 24 * 60 * 60);
			} catch { /* riwayat best-effort */ }
		}
		return json({ success: true, message: `${file.recordCount} data siap diunduh`, data: hasil });
	} catch (err) {
		if (err instanceof ImporEksporError) return json({ success: false, message: err.message }, { status: err.status });
		log.api.error({ err }, 'POST app/export');
		return json({ success: false, message: 'Gagal membuat file export' }, { status: 500 });
	}
}
