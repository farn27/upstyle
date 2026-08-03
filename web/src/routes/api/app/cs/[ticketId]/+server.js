import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTickets, riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// PUT /api/app/cs/[ticketId] — update status tiket
export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const ticketId = Number(params.ticketId);
    if (!ticketId) return json({ success: false, message: 'ticketId tidak valid' }, { status: 400 });

    try {
        const body = await request.json();
        const { status } = body;

        if (!status) return json({ success: false, message: 'status wajib diisi' }, { status: 400 });

        const ticket = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });
        if (!ticket) return json({ success: false, message: 'Tiket tidak ditemukan' }, { status: 404 });

        await db.update(supportTickets)
            .set({ status, ...(status === 'RESOLVED' ? { resolvedAt: new Date().toISOString() } : {}) })
            .where(eq(supportTickets.id, ticketId));

        await db.insert(riwayatAksi).values({
            userId, unitId: ticket.unitId,
            pesan: `Status tiket #${ticket.ticketNumber} diubah menjadi ${status}`,
            kategori: 'CS', tipe: 'info'
        });

        return json({ success: true, message: `Status tiket berhasil diubah menjadi ${status}` });
    } catch (err) {
        log.api.error({ err }, 'PUT /api/app/cs/[ticketId] error');
        return json({ success: false, message: 'Gagal update status tiket' }, { status: 500 });
    }
}
