import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, or, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';

export async function resolvePosUnitAccess(cookies, params, locals) {
    const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
    const { slug } = params;
    const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });

    let unit = null;

    if (staffSession) {
        const unitRows = await db
            .select({
                id: unitBisnis.id,
                user_id: unitBisnis.userId,
                slug: unitBisnis.slug,
                login_slug: unitBisnis.loginSlug,
                nama_unit: unitBisnis.namaUnit,
                kategori: unitBisnis.kategori,
                posFeatureOverride: unitBisnis.posFeatureOverride
            })
            .from(unitBisnis)
            .where(eq(unitBisnis.id, staffSession.unit_id))
            .limit(1);

        if (unitRows.length === 0) {
            throw error(404, 'Unit bisnis tidak ditemukan');
        }

        unit = unitRows[0];

        if (unit.slug !== slug && unit.login_slug !== slug) {
            const fallbackRows = await db
                .select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug,
                    nama_unit: unitBisnis.namaUnit,
                    kategori: unitBisnis.kategori,
                    posFeatureOverride: unitBisnis.posFeatureOverride
                })
                .from(unitBisnis)
                .where(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)))
                .limit(1);

            if (fallbackRows.length > 0 && fallbackRows[0].id !== unit.id) {
                unit = fallbackRows[0];
            }
        }
    } else {
        let unitRows = [];

        if (ownerUserId) {
            unitRows = await db
                .select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug,
                    nama_unit: unitBisnis.namaUnit,
                    kategori: unitBisnis.kategori,
                    posFeatureOverride: unitBisnis.posFeatureOverride
                })
                .from(unitBisnis)
                .where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, ownerUserId)))
                .limit(1);
        }

        if (unitRows.length === 0) {
            unitRows = await db
                .select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug,
                    nama_unit: unitBisnis.namaUnit,
                    kategori: unitBisnis.kategori,
                    posFeatureOverride: unitBisnis.posFeatureOverride
                })
                .from(unitBisnis)
                .where(eq(unitBisnis.slug, slug))
                .limit(1);
        }

        if (unitRows.length === 0 && ownerUserId) {
            unitRows = await db
                .select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug,
                    nama_unit: unitBisnis.namaUnit,
                    kategori: unitBisnis.kategori,
                    posFeatureOverride: unitBisnis.posFeatureOverride
                })
                .from(unitBisnis)
                .where(and(eq(unitBisnis.loginSlug, slug), eq(unitBisnis.userId, ownerUserId)))
                .limit(1);
        }

        if (unitRows.length === 0) {
            unitRows = await db
                .select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug,
                    nama_unit: unitBisnis.namaUnit,
                    kategori: unitBisnis.kategori,
                    posFeatureOverride: unitBisnis.posFeatureOverride
                })
                .from(unitBisnis)
                .where(eq(unitBisnis.loginSlug, slug))
                .limit(1);
        }

        if (unitRows.length === 0) {
            throw error(404, 'Unit bisnis tidak ditemukan');
        }

        unit = unitRows[0];
    }

    const isOwner = ownerUserId && Number(unit.user_id) === Number(ownerUserId);
    const isStaff = staffSession && Number(staffSession.unit_id) === Number(unit.id) && !isOwner;

    if (!isOwner && !isStaff) {
        throw error(403, 'Anda tidak memiliki akses ke unit ini');
    }

    return {
        unit,
        ownerUserId,
        staffSession,
        isOwner,
        isStaff
    };
}
