import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// PUT /api/app/notifications/read-all?unitId=X
export async function PUT({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        await db.update(riwayatAksi)
            .set({ isRead: 1 })
            .where(and(eq(riwayatAksi.unitId, Number(unitId)), eq(riwayatAksi.isRead, 0)));

        return json({ success: true, message: 'Semua notifikasi ditandai dibaca' });
    } catch (err) {
        log.api.error({ err }, 'PUT notifications/read-all');
        return json({ success: false, message: 'Gagal tandai dibaca' }, { status: 500 });
    }
}
