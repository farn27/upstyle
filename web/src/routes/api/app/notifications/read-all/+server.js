import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi, unitBisnis } from '$lib/server/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { log } from '$lib/server/logger';

// PUT /api/app/notifications/read-all[?unitId=X]  — tanpa unitId: semua unit milik user
export async function PUT({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');

    try {
        let unitIds;
        if (unitId) {
            if (!(await unitMilikUser(db, userId, Number(unitId)))) {
                return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
            }
            unitIds = [Number(unitId)];
        } else {
            unitIds = (await db.select({ id: unitBisnis.id }).from(unitBisnis).where(eq(unitBisnis.userId, userId))).map((u) => u.id);
        }
        if (unitIds.length > 0) {
            await db.update(riwayatAksi)
                .set({ isRead: 1 })
                .where(and(inArray(riwayatAksi.unitId, unitIds), eq(riwayatAksi.isRead, 0)));
        }
        return json({ success: true, message: 'Semua notifikasi ditandai dibaca' });
    } catch (err) {
        log.api.error({ err }, 'PUT notifications/read-all');
        return json({ success: false, message: 'Gagal tandai dibaca' }, { status: 500 });
    }
}
