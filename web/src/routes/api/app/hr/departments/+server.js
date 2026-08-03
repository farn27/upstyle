import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { departments, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/hr/departments?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const depts = await db.query.departments.findMany({
            where: eq(departments.unitId, Number(unitId)),
            orderBy: [desc(departments.id)]
        });
        const data = depts.map(d => ({ id: d.id, unitId: d.unitId, name: d.name || '' }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET hr/departments');
        return json({ success: false, message: 'Gagal memuat departemen' }, { status: 500 });
    }
}

// POST /api/app/hr/departments
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, unitId } = body;
        if (!name || !unitId) return json({ success: false, message: 'name dan unitId wajib' }, { status: 400 });

        const [result] = await db.insert(departments).values({ unitId: Number(unitId), name });
        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Departemen baru: ${name}`, kategori: 'HR', tipe: 'success'
        });

        return json({ success: true, message: 'Departemen berhasil dibuat', data: { id: result.insertId } });
    } catch (err) {
        log.api.error({ err }, 'POST hr/departments');
        return json({ success: false, message: 'Gagal buat departemen' }, { status: 500 });
    }
}
