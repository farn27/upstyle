import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTickets, supportTicketMessages, crmContacts, users } from '$lib/server/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { nowSqlWIB } from '$lib/server/dateUtils';

export const load = async ({ params, cookies, url }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Unauthorized');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const selectedTicketId = url.searchParams.get('ticketId');

    // Ambil daftar tiket
    const tickets = await db.select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        updatedAt: supportTickets.lastResponseAt,
        customerName: crmContacts.nama,
    })
    .from(supportTickets)
    .leftJoin(crmContacts, eq(supportTickets.customerId, crmContacts.id))
    .where(eq(supportTickets.unitId, unit.id))
    .orderBy(desc(supportTickets.lastResponseAt));

    let activeTicket = null;
    let messages = [];

    if (selectedTicketId) {
        activeTicket = await db.query.supportTickets.findFirst({
            // Tiket HARUS milik unit ini (dulu ?ticket=ID unit lain ikut terbaca)
            where: and(eq(supportTickets.id, Number(selectedTicketId)), eq(supportTickets.unitId, unit.id)),
            with: {
                customer: true // jika relasi tersedia
            }
        });

        // Jika relasi tidak jalan, query manual
        if (activeTicket && !activeTicket.customer && activeTicket.customerId) {
             const cust = await db.query.crmContacts.findFirst({ where: eq(crmContacts.id, activeTicket.customerId) });
             activeTicket.customer = cust;
        }

        if (activeTicket) {
            messages = await db.select()
                .from(supportTicketMessages)
                .where(eq(supportTicketMessages.ticketId, activeTicket.id))
                .orderBy(supportTicketMessages.createdAt);
        } else {
            activeTicket = null;
        }
    }

    return {
        unit,
        tickets,
        activeTicket,
        messages,
        userId
    };
};

export const actions = {
    replyTicket: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

        const formData = await request.formData();
        const ticketId = formData.get('ticketId');
        const message = formData.get('message');

        if (!ticketId || !message) {
            return fail(400, { message: 'Pesan tidak boleh kosong' });
        }

        const tiket = await db.query.supportTickets.findFirst({
            where: and(eq(supportTickets.id, Number(ticketId)), eq(supportTickets.unitId, unit.id))
        });
        if (!tiket) return fail(404, { message: 'Tiket tidak ditemukan' });

        try {
            await db.insert(supportTicketMessages).values({
                ticketId: Number(ticketId),
                senderType: 'STAFF',
                senderId: userId,
                message: message.toString()
            });

            // Update lastResponseAt & status if needed
            await db.update(supportTickets)
                .set({ 
                    lastResponseAt: nowSqlWIB(), 
                    status: 'IN_PROGRESS' 
                })
                .where(eq(supportTickets.id, Number(ticketId)));

            return { success: true, message: 'Balasan terkirim' };
        } catch (e) {
            console.error('Reply error:', e);
            return fail(500, { message: 'Gagal mengirim pesan' });
        }
    }
};
