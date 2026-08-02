import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTickets, supportTicketMessages, crmContacts } from '$lib/server/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function POST({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { ticketId } = params;
    if (!ticketId) return json({ success: false, message: 'ticketId wajib diisi' }, { status: 400 });

    try {
        const body = await request.json();
        const { message, senderType, mediaUrl } = body;

        if (!message) {
            return json({ success: false, message: 'Pesan wajib diisi' }, { status: 400 });
        }

        const now = new Date();
        const sType = senderType || 'STAFF';

        const [result] = await db.insert(supportTicketMessages).values({
            ticketId: Number(ticketId),
            senderType: sType,
            senderId: userId,
            message,
            mediaUrl: mediaUrl || null,
            createdAt: now
        });

        await db.update(supportTickets)
            .set({ lastResponseAt: now })
            .where(eq(supportTickets.id, Number(ticketId)));

        return json({
            success: true,
            message: 'Balasan ticket berhasil dikirim',
            data: {
                id: result.insertId,
                ticketId: Number(ticketId),
                senderType: sType,
                senderId: userId,
                message,
                mediaUrl: mediaUrl || null,
                createdAt: now
            }
        });
    } catch (err) {
        log.api.error({ err }, 'API POST CS TICKET REPLY ERROR');
        return json({ success: false, message: 'Gagal mengirim balasan ticket' }, { status: 500 });
    }
}
