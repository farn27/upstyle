import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { requireVerifiedStaffSession, requireCategory } from '$lib/server/portalAuth';
import { log } from '$lib/server/logger';

export async function load({ cookies, params }) {
    const staffSession = await requireVerifiedStaffSession(cookies, params.login_slug);

    if (!requireCategory(staffSession, ['production', 'operator', 'manager', 'admin', 'owner'])) {
        throw error(403, 'Anda tidak memiliki akses ke halaman ini');
    }

    try {
        const units = await db.select({
            id: unitBisnis.id,
            nama_unit: unitBisnis.namaUnit,
            slug: unitBisnis.slug,
            login_slug: unitBisnis.loginSlug
        })
        .from(unitBisnis)
        .where(and(
            eq(unitBisnis.id, staffSession.unit_id),
            eq(unitBisnis.loginSlug, params.login_slug),
            eq(unitBisnis.isPortalActive, 1)
        ));

        if (units.length === 0) {
            throw redirect(302, `/portal/${params.login_slug}`);
        }

        const unit = units[0];

        return {
            unit
        };
    } catch (err) {
        log.api.error({ err }, 'Production Portal Load Error');
        throw error(500, "Internal Server Error");
    }
}
