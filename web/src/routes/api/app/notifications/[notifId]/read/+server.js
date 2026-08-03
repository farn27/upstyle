import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// PUT /api/app/notifications/[notifId]/read
export async function PUT({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const notifId = Number(params.notifId);
    if (!notifId) return json({ success: false, message: 'notifId tidak valid' }, { status: 400 });

    try {
        await db.update(riwayatAksi).set({ isRead: 1 }).where(eq(riwayatAksi.id, notifId));
        return json({ success: true, message: 'Notifikasi ditandai dibaca' });
    } catch (err) {
        log.api.error({ err }, 'PUT notifications/[notifId]/read');
        return json({ success: false, message: 'Gagal update notifikasi' }, { status: 500 });
    }
}
