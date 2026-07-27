import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, supportTickets, supportTicketMessages, crmContacts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { nowWIB } from '$lib/server/dateUtils';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';
import { inngest } from '$lib/server/inngest';

export const load = async ({ params, cookies, url }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    const statusFilter = url.searchParams.get('status') || 'all';
    const priorityFilter = url.searchParams.get('priority') || 'all';

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Cache per filter — TTL 30 detik (tiket harus near-realtime)
    const cacheKey = `cs_tickets:${unit.id}:${statusFilter}:${priorityFilter}`;
    const cached = await redis.get(cacheKey);

    let tickets, contacts;
    if (cached) {
        tickets = cached.tickets;
        contacts = cached.contacts;
    } else {
        let allTickets = await db.query.supportTickets.findMany({
            where: eq(supportTickets.unitId, unit.id),
            orderBy: [desc(supportTickets.createdAt)],
            with: { customer: true, messages: { orderBy: [desc(supportTicketMessages.createdAt)], limit: 1 } }
        });
        if (statusFilter !== 'all') allTickets = allTickets.filter(t => t.status === statusFilter);
        if (priorityFilter !== 'all') allTickets = allTickets.filter(t => t.priority === priorityFilter);
        tickets = allTickets;
        contacts = await db.query.crmContacts.findMany({
            where: eq(crmContacts.unitId, unit.id),
            columns: { id: true, nama: true }
        });
        await redis.set(cacheKey, { tickets, contacts }, { ex: 30 });
    }

    return { unit, tickets, contacts, statusFilter, priorityFilter };
};

export const actions = {
    create: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const subject = String(data.get('subject') || '').trim();
        const description = String(data.get('description') || '');
        const priority = String(data.get('priority') || 'MEDIUM');
        const customerId = data.get('customer_id') ? Number(data.get('customer_id')) : null;

        if (!subject) return fail(400, { error: 'Subjek tiket wajib diisi' });
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            const ticketNumber = `TKT-${unit.id}-${Date.now()}`;
            await db.insert(supportTickets).values({
                unitId: unit.id, customerId, ticketNumber,
                subject, description, priority, status: 'OPEN'
            });
            // Invalidate cache + realtime + background job
            const keys = await redis.keys(`cs_tickets:${unit.id}:*`);
            if (keys.length) await redis.del(...keys);
            await redis.del(`cs_dash:${unit.id}`);
            pusherServer.trigger(`cs-${slug}`, 'ticket-new', { subject, priority }).catch(() => {});
            await inngest.send({ name: 'cs/ticket.created', data: { unitId: unit.id, slug, subject, priority } });
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal buat tiket: ' + err.message });
        }
    },

    updateStatus: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = Number(data.get('ticket_id'));
        const status = String(data.get('status'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            const extra = status === 'RESOLVED' ? { resolvedAt: nowWIB().toISOString() } : {};
            await db.update(supportTickets).set({ status, ...extra })
                .where(and(eq(supportTickets.id, id), eq(supportTickets.unitId, unit.id)));
            // Invalidate + realtime
            const keys = await redis.keys(`cs_tickets:${unit.id}:*`);
            if (keys.length) await redis.del(...keys);
            await redis.del(`cs_dash:${unit.id}`);
            pusherServer.trigger(`cs-${slug}`, 'ticket-updated', { ticketId: id, status }).catch(() => {});
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal update status' });
        }
    },

    addMessage: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const ticketId = Number(data.get('ticket_id'));
        const message = String(data.get('message') || '').trim();

        if (!message) return fail(400, { error: 'Pesan tidak boleh kosong' });
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.insert(supportTicketMessages).values({
                ticketId, senderType: 'STAFF', senderId: userId, message
            });
            await db.update(supportTickets).set({ lastResponseAt: nowWIB().toISOString() })
                .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.unitId, unit.id)));
            // Realtime — kirim pesan baru ke channel tiket
            pusherServer.trigger(`cs-ticket-${ticketId}`, 'new-message', {
                senderType: 'STAFF', message, ts: Date.now()
            }).catch(() => {});
            const keys = await redis.keys(`cs_tickets:${unit.id}:*`);
            if (keys.length) await redis.del(...keys);
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal kirim pesan' });
        }
    }
};
