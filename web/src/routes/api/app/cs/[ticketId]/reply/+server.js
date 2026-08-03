import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTicketMessages, supportTickets, riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// POST /api/app/cs/[ticketId]/reply — kirim balasan agen
export async function POST({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const ticketId = Number(params.ticketId);
    if (!ticketId) return json({ success: false, message: 'ticketId tidak valid' }, { status: 400 });

    try {
        const body = await request.json();
        const { message } = body;
        if (!message || !message.trim()) return json({ success: false, message: 'Pesan tidak boleh kosong' }, { status: 400 });

        const ticket = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });
        if (!ticket) return json({ success: false, message: 'Tiket tidak ditemukan' }, { status: 404 });

        await db.insert(supportTicketMessages).values({
            ticketId,
            senderType: 'STAFF',
            senderId: userId,
            message: message.trim(),
            createdAt: new Date().toISOString()
        });

        // Update lastResponseAt
        await db.update(supportTickets)
            .set({ lastResponseAt: new Date().toISOString(), status: 'IN_PROGRESS' })
            .where(eq(supportTickets.id, ticketId));

        await db.insert(riwayatAksi).values({
            userId, unitId: ticket.unitId,
            pesan: `Balasan dikirim ke tiket #${ticket.ticketNumber}`,
            kategori: 'CS', tipe: 'success'
        });

        return json({ success: true, message: 'Balasan berhasil dikirim' });
    } catch (err) {
        log.api.error({ err }, 'POST /api/app/cs/[ticketId]/reply error');
        return json({ success: false, message: 'Gagal kirim balasan' }, { status: 500 });
    }
}
