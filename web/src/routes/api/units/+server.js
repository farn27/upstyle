import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { log } from '$lib/server/logger';

/**
 * GET /api/units?userId=XYZ
 * Mengembalikan daftar unit bisnis milik user.
 */
export async function GET({ url }) {
    const userId = url.searchParams.get('userId');
    if (!userId) {
        return json({ units: [] });
    }

    try {
        const units = await db.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit, slug: unitBisnis.slug })
            .from(unitBisnis)
            .where(eq(unitBisnis.userId, Number(userId)));
        return json({ units });
    } catch (e) {
        log.api.error({ err: e }, 'Error fetching units');
        return json({ units: [] });
    }
}
