import { json } from '@sveltejs/kit';
import { nowSqlWIB } from '$lib/server/dateUtils';
import { db } from '$lib/server/drizzle';
import { supportTickets, riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { log } from '$lib/server/logger';

// PUT /api/app/cs/[ticketId] — update status tiket
export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const ticketId = Number(params.ticketId);
    if (!ticketId) return json({ success: false, message: 'ticketId tidak valid' }, { status: 400 });

    try {
        const body = await request.json();
        // Terima "In Progress" / "in_progress" / "IN_PROGRESS" → IN_PROGRESS
        const norm = (v) => String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
        const status = body.status ? norm(body.status) : '';
        const priority = body.priority ? norm(body.priority) : '';

        if (!status && !priority) return json({ success: false, message: 'status atau priority wajib diisi' }, { status: 400 });
        if (status && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
            return json({ success: false, message: 'Status harus OPEN, IN_PROGRESS, RESOLVED, atau CLOSED' }, { status: 400 });
        }
        if (priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
            return json({ success: false, message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT' }, { status: 400 });
        }

        const ticket = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });
        if (!ticket || !(await unitMilikUser(db, userId, ticket.unitId))) {
            return json({ success: false, message: 'Tiket tidak ditemukan' }, { status: 404 });
        }

        await db.update(supportTickets)
            .set({
                ...(status ? { status } : {}),
                ...(priority ? { priority } : {}),
                ...(status === 'RESOLVED' ? { resolvedAt: nowSqlWIB() } : {})
            })
            .where(eq(supportTickets.id, ticketId));

        await db.insert(riwayatAksi).values({
            userId, unitId: ticket.unitId,
            pesan: status
                ? `Status tiket #${ticket.ticketNumber} diubah menjadi ${status}`
                : `Prioritas tiket #${ticket.ticketNumber} diubah menjadi ${priority}`,
            kategori: 'CS', tipe: 'info'
        });

        return json({ success: true, message: status ? `Status tiket berhasil diubah menjadi ${status}` : `Prioritas tiket diubah menjadi ${priority}` });
    } catch (err) {
        log.api.error({ err }, 'PUT /api/app/cs/[ticketId] error');
        return json({ success: false, message: 'Gagal update status tiket' }, { status: 500 });
    }
}
