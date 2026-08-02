import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function PUT({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        await db.update(riwayatAksi)
            .set({ isRead: 1 })
            .where(eq(riwayatAksi.unitId, Number(unitId)));

        return json({ success: true, message: "Semua notifikasi telah dibaca" });
    } catch (err) {
        log.api.error({ err }, 'API PUT NOTIFICATIONS READ ALL ERROR');
        return json({ success: false, message: "Gagal menandai notifikasi dibaca" }, { status: 500 });
    }
}
