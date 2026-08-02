import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmContacts, crmDeals, crmActivities, crmTasks, quotations, quotationItems, salesOrders, salesOrderItems, marketingCampaigns } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// GET: ?unitId= (optional ?contactId=, ?dealId=) - fetch CRM tasks, ordered by createdAt desc
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });

    const contactId = url.searchParams.get('contactId');
    const dealId = url.searchParams.get('dealId');

    try {
        const conditions = [eq(crmTasks.unitId, Number(unitId))];
        if (contactId) {
            conditions.push(eq(crmTasks.kontakId, Number(contactId)));
        }
        if (dealId) {
            conditions.push(eq(crmTasks.dealId, Number(dealId)));
        }

        const tasks = await db.query.crmTasks.findMany({
            where: and(...conditions),
            orderBy: [desc(crmTasks.createdAt)]
        });

        return json({ success: true, message: 'Berhasil mengambil data task', data: tasks });
    } catch (err) {
        log.crm.error({ err }, 'API GET CRM TASKS ERROR');
        return json({ success: false, message: 'Gagal mengambil data task: ' + err.message, data: null }, { status: 500 });
    }
}

// POST: Create task. Body: { unitId, kontakId?, dealId?, deskripsi, deadline }. Set ownerId=userId, status='pending'.
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, kontakId, dealId, deskripsi, deadline } = body;

        if (!unitId || !deskripsi) {
            return json({ success: false, message: 'unitId dan deskripsi wajib diisi', data: null }, { status: 400 });
        }

        const [result] = await db.insert(crmTasks).values({
            ownerId: userId,
            unitId: Number(unitId),
            kontakId: kontakId ? Number(kontakId) : null,
            dealId: dealId ? Number(dealId) : null,
            deskripsi,
            deadline: deadline || null,
            status: 'pending'
        });

        return json({
            success: true,
            message: 'Task berhasil dibuat',
            data: { id: result.insertId }
        });
    } catch (err) {
        log.crm.error({ err }, 'API POST CRM TASKS ERROR');
        return json({ success: false, message: 'Gagal membuat task: ' + err.message, data: null }, { status: 500 });
    }
}

// PUT: Update task. Body: { id, status, deskripsi, deadline }.
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { id, status, deskripsi, deadline } = body;

        if (!id) {
            return json({ success: false, message: 'id task wajib diisi', data: null }, { status: 400 });
        }

        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
        if (deadline !== undefined) updateData.deadline = deadline;

        if (Object.keys(updateData).length === 0) {
            return json({ success: false, message: 'Tidak ada data yang diperbarui', data: null }, { status: 400 });
        }

        await db.update(crmTasks)
            .set(updateData)
            .where(eq(crmTasks.id, Number(id)));

        return json({ success: true, message: 'Task berhasil diperbarui', data: null });
    } catch (err) {
        log.crm.error({ err }, 'API PUT CRM TASKS ERROR');
        return json({ success: false, message: 'Gagal memperbarui task: ' + err.message, data: null }, { status: 500 });
    }
}

// DELETE: ?taskId= - delete task
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const taskId = url.searchParams.get('taskId');
    if (!taskId) {
        return json({ success: false, message: 'taskId wajib diisi', data: null }, { status: 400 });
    }

    try {
        await db.delete(crmTasks).where(eq(crmTasks.id, Number(taskId)));

        return json({ success: true, message: 'Task berhasil dihapus', data: null });
    } catch (err) {
        log.crm.error({ err }, 'API DELETE CRM TASKS ERROR');
        return json({ success: false, message: 'Gagal menghapus task: ' + err.message, data: null }, { status: 500 });
    }
}
