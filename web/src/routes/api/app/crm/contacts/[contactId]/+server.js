import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmContacts, crmDeals, crmActivities, crmTasks, quotations, quotationItems, salesOrders, salesOrderItems, marketingCampaigns } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// GET: params.contactId. Fetch contact detail with their deals & activities
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const contactId = params.contactId;
    if (!contactId || isNaN(Number(contactId))) {
        return json({ success: false, message: 'contactId tidak valid', data: null }, { status: 400 });
    }

    try {
        const contact = await db.query.crmContacts.findFirst({
            where: eq(crmContacts.id, Number(contactId)),
            with: {
                deals: true,
                activities: true
            }
        });

        if (!contact) {
            return json({ success: false, message: 'Kontak tidak ditemukan', data: null }, { status: 404 });
        }

        return json({
            success: true,
            message: 'Berhasil mengambil detail kontak',
            data: contact
        });
    } catch (err) {
        log.crm.error({ err }, 'API GET CRM CONTACT DETAIL ERROR');
        return json({ success: false, message: 'Gagal mengambil detail kontak: ' + err.message, data: null }, { status: 500 });
    }
}
