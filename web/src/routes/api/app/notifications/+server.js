import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { riwayatAksi, unitBisnis } from '$lib/server/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { log } from '$lib/server/logger';

// GET /api/app/notifications?limit=30[&unitId=X][&before=<id>]
// - dengan unitId  : notifikasi satu unit
// - tanpa unitId   : semua unit milik user (seperti lonceng notifikasi di web), dengan nama unit
// - before=<id>    : halaman berikutnya (id lebih kecil)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 30), 1), 100);
    const before = Number(url.searchParams.get('before') || 0);

    try {
        if (unitId && !(await unitMilikUser(db, userId, Number(unitId)))) {
            return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
        }
        const filter = [unitId ? eq(riwayatAksi.unitId, Number(unitId)) : eq(unitBisnis.userId, userId)];
        if (before > 0) filter.push(lt(riwayatAksi.id, before));

        const rows = await db.select({
            id: riwayatAksi.id, unitId: riwayatAksi.unitId, pesan: riwayatAksi.pesan, tipe: riwayatAksi.tipe,
            waktu: riwayatAksi.waktu, isRead: riwayatAksi.isRead, link: riwayatAksi.link, kategori: riwayatAksi.kategori,
            unitNama: unitBisnis.namaUnit
        })
            .from(riwayatAksi)
            .innerJoin(unitBisnis, eq(unitBisnis.id, riwayatAksi.unitId))
            .where(and(...filter))
            .orderBy(desc(riwayatAksi.id))
            .limit(limit + 1);

        const adaLagi = rows.length > limit;
        const data = rows.slice(0, limit).map(n => ({
            id: n.id, unitId: n.unitId, unitNama: n.unitNama || '', pesan: n.pesan,
            tipe: n.tipe || 'info', waktu: n.waktu ? String(n.waktu) : '',
            isRead: n.isRead || 0, link: n.link || null,
            kategori: n.kategori || 'SYSTEM'
        }));

        return json({ success: true, data, adaLagi });
    } catch (err) {
        log.api.error({ err }, 'GET notifications');
        return json({ success: false, message: 'Gagal memuat notifikasi' }, { status: 500 });
    }
}
