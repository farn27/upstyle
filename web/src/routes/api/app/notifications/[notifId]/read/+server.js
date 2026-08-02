import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function PUT({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const notifId = params.notifId;
    if (!notifId) return json({ success: false, message: "notifId wajib diisi" }, { status: 400 });

    try {
        await db.update(riwayatAksi)
            .set({ isRead: 1 })
            .where(eq(riwayatAksi.id, Number(notifId)));

        return json({ success: true, message: "Notifikasi telah dibaca" });
    } catch (err) {
        log.api.error({ err }, 'API PUT NOTIFICATION READ ERROR');
        return json({ success: false, message: "Gagal menandai notifikasi dibaca" }, { status: 500 });
    }
}
