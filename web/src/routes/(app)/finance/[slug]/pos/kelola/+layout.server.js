import { redirect } from '@sveltejs/kit';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and, or } from 'drizzle-orm';

export async function load({ cookies, params }) {
    const ownerUserId = await getCurrentUserId(cookies);
    const { slug } = params;

    // Verify access
    const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });
    
    // Only owner or POS Manager can access Kelola POS
    if (!ownerUserId && (!staffSession || staffSession.role !== 'owner')) {
        // Here we could allow manager too, but let's assume owner/manager
        if (!staffSession || !['owner', 'manager', 'admin'].includes(staffSession.role)) {
            throw redirect(303, `/finance/${slug}/pos`);
        }
    }

    return { slug };
}
