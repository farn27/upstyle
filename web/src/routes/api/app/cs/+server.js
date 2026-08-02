import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTickets, supportTicketMessages, crmContacts } from '$lib/server/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const tickets = await db.query.supportTickets.findMany({
            where: eq(supportTickets.unitId, Number(unitId)),
            orderBy: [desc(supportTickets.createdAt)],
            with: {
                customer: true
            }
        });

        const data = tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            createdAt: t.createdAt,
            customerName: t.customer?.namaLengkap || t.customer?.nama || null
        }));

        return json({
            success: true,
            message: 'Berhasil mengambil data support tickets',
            data
        });
    } catch (err) {
        log.api.error({ err }, 'API GET CS TICKETS ERROR');
        return json({ success: false, message: 'Gagal mengambil data support tickets' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, subject, description, priority, customerId } = body;

        if (!unitId || !subject) {
            return json({ success: false, message: 'unitId dan subject wajib diisi' }, { status: 400 });
        }

        const now = new Date();
        const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const random4 = Math.floor(1000 + Math.random() * 9000).toString();
        const ticketNumber = `TKT-${yyyymmdd}-${random4}`;

        const [result] = await db.insert(supportTickets).values({
            unitId: Number(unitId),
            ticketNumber,
            subject,
            description: description || null,
            priority: priority || 'MEDIUM',
            status: 'OPEN',
            customerId: customerId ? Number(customerId) : null,
            createdAt: now
        });

        const createdTicket = {
            id: result.insertId,
            unitId: Number(unitId),
            ticketNumber,
            subject,
            description: description || null,
            priority: priority || 'MEDIUM',
            status: 'OPEN',
            customerId: customerId ? Number(customerId) : null,
            createdAt: now
        };

        return json({
            success: true,
            message: 'Support ticket berhasil dibuat',
            data: createdTicket
        }, { status: 201 });
    } catch (err) {
        log.api.error({ err }, 'API POST CS TICKET ERROR');
        return json({ success: false, message: 'Gagal membuat support ticket' }, { status: 500 });
    }
}
