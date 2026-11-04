import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { signSocketToken } from '$lib/server/socketToken';
import { log } from '$lib/server/logger';

/**
 * GET /api/socket-token?unitId=123
 * Menerbitkan token Socket.io hanya untuk unit yang boleh diakses:
 * - owner unit (session_id), atau
 * - staff aktif unit tsb (staff_session_token, mis. kasir POS)
 */
export const GET = async ({ url, locals, cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const unitId = Number(url.searchParams.get('unitId'));
	if (!Number.isInteger(unitId) || unitId <= 0) {
		return json({ message: 'unitId tidak valid' }, { status: 400 });
	}

	try {
		// Owner
		if (locals.user?.id) {
			const [unit] = await db
				.select({ id: unitBisnis.id })
				.from(unitBisnis)
				.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, locals.user.id)))
				.limit(1);

			if (unit) {
				return json(signSocketToken({ sub: `user:${locals.user.id}`, unitId }));
			}
		}

		// Staff (kasir / portal)
		const staff = await getVerifiedStaffSession(cookies);
		if (staff && staff.unit_id === unitId) {
			return json(signSocketToken({ sub: `staff:${staff.id}`, unitId }));
		}

		return json({ message: 'Tidak punya akses ke unit ini' }, { status: 403 });
	} catch (err) {
		log.auth.error({ err: err?.message, unitId }, '[SocketToken] Gagal menerbitkan token');
		return json({ message: 'Realtime tidak tersedia' }, { status: 503 });
	}
};
