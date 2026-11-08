import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { getCurrentUserId } from '$lib/server/getUser';
import { signSocketToken } from '$lib/server/socketToken';
import { env } from '$env/dynamic/private';
import { log } from '$lib/server/logger';

/**
 * GET /api/app/realtime?unitId=X  → { socketUrl, token, exp }
 * Konfigurasi realtime untuk app (Authorization: Bearer): alamat server Socket.io berasal dari env
 * PUBLIC_SOCKET_URL (bukan di-hardcode di app) + token HMAC khusus unit yang dimiliki user.
 */
export async function GET({ url, cookies, request, setHeaders }) {
	setHeaders({ 'cache-control': 'no-store' });
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

	const unitId = Number(url.searchParams.get('unitId'));
	if (!Number.isInteger(unitId) || unitId <= 0) return json({ success: false, message: 'unitId tidak valid' }, { status: 400 });

	const [unit] = await db.select({ id: unitBisnis.id }).from(unitBisnis)
		.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId))).limit(1);
	if (!unit) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });

	const socketUrl = (env.PUBLIC_SOCKET_URL || '').trim();
	if (!socketUrl) return json({ success: true, data: { socketUrl: '', token: '', exp: 0 } });

	try {
		const { token, exp } = signSocketToken({ sub: `user:${userId}`, unitId });
		return json({ success: true, data: { socketUrl, token, exp } });
	} catch (err) {
		log.api.error({ err: err instanceof Error ? err.message : 'error' }, 'GET app/realtime');
		return json({ success: false, message: 'Realtime tidak tersedia' }, { status: 503 });
	}
}
