import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTickets, supportTicketMessages, crmContacts } from '$lib/server/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { ticketId } = params;
    if (!ticketId) return json({ success: false, message: 'ticketId wajib diisi' }, { status: 400 });

    try {
        const messages = await db.query.supportTicketMessages.findMany({
            where: eq(supportTicketMessages.ticketId, Number(ticketId)),
            orderBy: [asc(supportTicketMessages.createdAt)]
        });

        return json({
            success: true,
            message: 'Berhasil mengambil pesan ticket',
            data: messages
        });
    } catch (err) {
        log.api.error({ err }, 'API GET CS TICKET MESSAGES ERROR');
        return json({ success: false, message: 'Gagal mengambil pesan ticket' }, { status: 500 });
    }
}
