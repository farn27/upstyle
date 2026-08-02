import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { payables, accountingContacts } from '$lib/server/schema';
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

    // 2-step query karena TiDB tidak support LATERAL JOIN dari Drizzle `with:`
    const invoiceRaw = await db.query.payables.findFirst({
        where: and(
            eq(payables.id, Number(id)),
            eq(payables.unitId, unit.id)
        )
    });

    if (!invoiceRaw) throw error(404, 'Faktur Hutang tidak ditemukan');

    let contact = null;
    if (invoiceRaw.contactId) {
        contact = await db.query.accountingContacts.findFirst({
            where: eq(accountingContacts.id, invoiceRaw.contactId)
        });
    }

    const invoice = { ...invoiceRaw, contact: contact || null };

    return {
        unit,
        invoice: JSON.parse(JSON.stringify(invoice))
    };
};
