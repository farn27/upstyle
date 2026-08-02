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
        const ticket = await db.query.supportTickets.findFirst({
            where: eq(supportTickets.id, Number(ticketId)),
            with: {
                customer: true,
                assignee: true,
                messages: true
            }
        });

        if (!ticket) {
            return json({ success: false, message: 'Ticket tidak ditemukan' }, { status: 404 });
        }

        return json({
            success: true,
            message: 'Berhasil mengambil detail ticket',
            data: ticket
        });
    } catch (err) {
        log.api.error({ err }, 'API GET CS TICKET DETAIL ERROR');
        return json({ success: false, message: 'Gagal mengambil detail ticket' }, { status: 500 });
    }
}

export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { ticketId } = params;
    if (!ticketId) return json({ success: false, message: 'ticketId wajib diisi' }, { status: 400 });

    try {
        const body = await request.json();
        const { status, assignedTo } = body;

        const updateData = {};
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'RESOLVED') {
                updateData.resolvedAt = new Date();
            }
        }
        if (assignedTo !== undefined) {
            updateData.assignedTo = assignedTo ? Number(assignedTo) : null;
        }

        if (Object.keys(updateData).length === 0) {
            return json({ success: false, message: 'Tidak ada data yang diperbarui' }, { status: 400 });
        }

        await db.update(supportTickets)
            .set(updateData)
            .where(eq(supportTickets.id, Number(ticketId)));

        const updatedTicket = await db.query.supportTickets.findFirst({
            where: eq(supportTickets.id, Number(ticketId))
        });

        return json({
            success: true,
            message: 'Ticket berhasil diperbarui',
            data: updatedTicket
        });
    } catch (err) {
        log.api.error({ err }, 'API PUT CS TICKET ERROR');
        return json({ success: false, message: 'Gagal memperbarui ticket' }, { status: 500 });
    }
}
