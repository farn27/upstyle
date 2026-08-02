import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const limitParam = url.searchParams.get('limit') || '30';
    
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const notifications = await db.query.riwayatAksi.findMany({
            where: eq(riwayatAksi.unitId, Number(unitId)),
            orderBy: [desc(riwayatAksi.id)],
            limit: Number(limitParam)
        });

        // Map to ensure it matches mobile KMP RiwayatAksi model
        const data = notifications.map(n => ({
            id: n.id,
            unitId: n.unitId,
            pesan: n.pesan,
            tipe: n.tipe || 'info',
            waktu: n.waktu || '',
            kategori: n.kategori || '',
            isRead: n.isRead || 0,
            link: n.link || null
        }));

        return json({ success: true, message: "Berhasil mengambil notifikasi", data });
    } catch (err) {
        log.api.error({ err }, 'API GET NOTIFICATIONS ERROR');
        return json({ success: false, message: "Gagal mengambil notifikasi" }, { status: 500 });
    }
}
