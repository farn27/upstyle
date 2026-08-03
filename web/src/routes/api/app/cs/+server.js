import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { supportTickets, supportTicketMessages, crmContacts, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/cs?unitId=X  — list semua tiket support
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const tickets = await db.query.supportTickets.findMany({
            where: eq(supportTickets.unitId, Number(unitId)),
            orderBy: [desc(supportTickets.id)],
            with: { customer: true }
        });

        const data = tickets.map(t => ({
            id: t.id,
            unitId: t.unitId,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            description: t.description || '',
            priority: t.priority,
            status: t.status,
            customerName: t.customer?.nama || 'Customer',
            assignedTo: t.assignedTo,
            createdAt: t.createdAt || '',
            lastMessage: null
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET /api/app/cs error');
        return json({ success: false, message: 'Gagal memuat tiket' }, { status: 500 });
    }
}

// POST /api/app/cs — buat tiket baru
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        action: z.string().optional(),
        subject: z.string().min(1).max(200),
        customerName: z.string().min(1),
        priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),
        message: z.string().optional().default(''),
        unitId: z.coerce.number().int().positive()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tiket CS tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const { subject, customerName, priority, message, unitId } = parsed.data;

        // Generate ticket number
        const ticketNumber = `TKT-${Date.now()}`;

        const [result] = await db.insert(supportTickets).values({
            unitId: Number(unitId),
            subject,
            priority,
            status: 'OPEN',
            ticketNumber,
            createdAt: new Date().toISOString()
        });

        const ticketId = result.insertId;

        // Add initial message if provided
        if (message && message.trim()) {
            await db.insert(supportTicketMessages).values({
                ticketId,
                senderType: 'CUSTOMER',
                senderId: userId,
                message: message.trim(),
                createdAt: new Date().toISOString()
            });
        }

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Tiket support baru dibuat: ${subject} dari ${customerName}`,
            kategori: 'CS', tipe: 'info'
        });

        return json({ success: true, message: 'Tiket berhasil dibuat', data: { id: ticketId, ticketNumber } });
    } catch (err) {
        log.api.error({ err }, 'POST /api/app/cs error');
        return json({ success: false, message: 'Gagal membuat tiket' }, { status: 500 });
    }
}
