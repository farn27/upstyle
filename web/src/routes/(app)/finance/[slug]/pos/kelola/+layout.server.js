import { redirect } from '@sveltejs/kit';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { peranManajer } from '$lib/server/unitSlugGuard';

export async function load({ cookies, params, locals }) {
    const { slug } = params;
    // Hanya pemilik unit atau staf berperan manajer. Dulu user login mana pun lolos (cukup punya sesi).
    const akses = await resolvePosUnitAccess(cookies, params, locals);
    if (!akses.isOwner && !(akses.isStaff && peranManajer(akses.staffSession?.role))) {
        throw redirect(303, `/finance/${slug}/pos`);
    }

    return { slug };
}
