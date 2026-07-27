import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { receivables } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug, id } = params;

    // Verify unit ownership
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Get invoice with contact
    const invoice = await db.query.receivables.findFirst({
        where: and(
            eq(receivables.id, Number(id)),
            eq(receivables.unitId, unit.id)
        ),
        with: {
            contact: true
        }
    });

    if (!invoice) throw error(404, 'Invoice tidak ditemukan');

    return {
        unit,
        invoice: JSON.parse(JSON.stringify(invoice))
    };
};
