import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTicketMessages, supportTickets } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/cs/[ticketId]/messages
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const ticketId = Number(params.ticketId);
    if (!ticketId) return json({ success: false, message: 'ticketId tidak valid' }, { status: 400 });

    try {
        const messages = await db.query.supportTicketMessages.findMany({
            where: eq(supportTicketMessages.ticketId, ticketId),
            orderBy: [asc(supportTicketMessages.id)]
        });

        const data = messages.map(m => ({
            id: m.id,
            ticketId: m.ticketId,
            senderId: m.senderId,
            senderType: m.senderType === 'STAFF' ? 'agent' : 'customer',
            message: m.message,
            createdAt: m.createdAt || ''
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET /api/app/cs/[ticketId]/messages error');
        return json({ success: false, message: 'Gagal memuat pesan' }, { status: 500 });
    }
}
