import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/notifications?unitId=X&limit=30
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    const limit = Math.min(Number(url.searchParams.get('limit') || 30), 100);

    try {
        const notifs = await db.query.riwayatAksi.findMany({
            where: eq(riwayatAksi.unitId, Number(unitId)),
            orderBy: [desc(riwayatAksi.id)],
            limit
        });

        const data = notifs.map(n => ({
            id: n.id, unitId: n.unitId, pesan: n.pesan,
            tipe: n.tipe || 'info', waktu: n.waktu || '',
            isRead: n.isRead || 0, link: n.link || null,
            kategori: n.kategori || 'SYSTEM'
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET notifications');
        return json({ success: false, message: 'Gagal memuat notifikasi' }, { status: 500 });
    }
}
