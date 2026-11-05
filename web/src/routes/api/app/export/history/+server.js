import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';

/** GET /api/app/export/history?unitId=X — 20 export terakhir (link unduhan tidak disimpan, buat ulang bila perlu) */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	if (!redis) return json({ success: true, data: [] });
	try {
		const raw = await redis.lrange(`export_hist:${unitId}`, 0, 19);
		const data = (raw || []).map((/** @type {any} */ r) => (typeof r === 'string' ? JSON.parse(r) : r)).map((/** @type {any} */ r) => ({ ...r, downloadUrl: null }));
		return json({ success: true, data });
	} catch {
		return json({ success: true, data: [] });
	}
}
