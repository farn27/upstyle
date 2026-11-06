import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

/**
 * GET /api/units
 * Daftar unit bisnis milik user yang sedang login.
 * Parameter ?userId= dulu dipakai dan bisa diisi sembarang ID (bocor tanpa login) — sekarang diabaikan.
 */
export async function GET({ cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) {
        return json({ units: [] }, { status: 401 });
    }

    try {
        const units = await db.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit, slug: unitBisnis.slug })
            .from(unitBisnis)
            .where(eq(unitBisnis.userId, userId));
        return json({ units });
    } catch (e) {
        log.api.error({ err: e }, 'Error fetching units');
        return json({ units: [] });
    }
}
