import { json } from '@sveltejs/kit';
import { nowSqlWIB } from '$lib/server/dateUtils';
import { db } from '$lib/server/drizzle';
import { supportTickets, supportTicketMessages, crmContacts, riwayatAksi, users } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
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
        const tickets = await db.select().from(supportTickets)
            .where(eq(supportTickets.unitId, Number(unitId))).orderBy(desc(supportTickets.id)).limit(300);
        // pelanggan & pesan terakhir diambil terpisah (tanpa LATERAL JOIN → jalan di MySQL/TiDB/MariaDB)
        const idK = [...new Set(tickets.map((t) => t.customerId).filter((x) => x != null))];
        const kontak = idK.length ? await db.select().from(crmContacts).where(inArray(crmContacts.id, /** @type {number[]} */ (idK))) : [];
        const petaK = new Map(kontak.map((c) => [c.id, c.nama]));
        const idT = tickets.map((t) => t.id);
        const pesan = idT.length ? await db.select().from(supportTicketMessages).where(inArray(supportTicketMessages.ticketId, idT)).orderBy(supportTicketMessages.id) : [];
        const terakhir = new Map();
        for (const m of pesan) terakhir.set(m.ticketId, m);
        const idA = [...new Set(tickets.map((t) => t.assignedTo).filter((x) => x != null))];
        const petugas = idA.length ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, /** @type {number[]} */ (idA))) : [];
        const petaA = new Map(petugas.map((u) => [u.id, u.username]));

        const data = tickets.map((t) => {
            const m = terakhir.get(t.id);
            return {
                id: t.id,
                unitId: t.unitId,
                ticketNumber: t.ticketNumber,
                subject: t.subject,
                description: t.description || '',
                priority: t.priority,
                status: t.status,
                customerId: t.customerId,
                customerName: (t.customerId != null && petaK.get(t.customerId)) || '',
                assignedTo: t.assignedTo != null ? (petaA.get(t.assignedTo) || String(t.assignedTo)) : null,
                createdAt: t.createdAt || '',
                updatedAt: t.lastResponseAt || t.createdAt || '',
                lastMessage: m ? m.message : null,
                lastMessageAt: m ? (m.createdAt || null) : null
            };
        });

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
        priority: z.preprocess((v) => (typeof v === 'string' ? v.toUpperCase() : v), z.enum(['LOW','MEDIUM','HIGH','URGENT'])).default('MEDIUM'),
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

        // Pelanggan: pakai kontak CRM unit ini dengan nama sama, atau buat baru (sebelumnya nama pelanggan hilang)
        let customerId = null;
        const nama = customerName.trim();
        const ada = await db.query.crmContacts.findFirst({ where: and(eq(crmContacts.unitId, Number(unitId)), eq(crmContacts.nama, nama)), columns: { id: true } });
        if (ada) customerId = ada.id;
        else {
            const [k] = await db.insert(crmContacts).values({ ownerId: userId, unitId: Number(unitId), nama, stage: 'customer', sumber: 'tiket' });
            customerId = k.insertId;
        }

        const [result] = await db.insert(supportTickets).values({
            unitId: Number(unitId),
            customerId,
            subject,
            description: message && message.trim() ? message.trim() : null,
            priority,
            status: 'OPEN',
            ticketNumber,
            lastResponseAt: nowSqlWIB(),
            createdAt: nowSqlWIB()
        });

        const ticketId = result.insertId;

        // Add initial message if provided
        if (message && message.trim()) {
            await db.insert(supportTicketMessages).values({
                ticketId,
                senderType: 'CUSTOMER',
                senderId: userId,
                message: message.trim(),
                createdAt: nowSqlWIB()
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
