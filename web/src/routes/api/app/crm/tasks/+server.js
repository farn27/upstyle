import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmTasks, crmContacts, crmDeals, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const tasks = await db.query.crmTasks.findMany({
            where: eq(crmTasks.unitId, Number(unitId)),
            orderBy: [desc(crmTasks.id)],
            with: { contact: true }
        });
        const data = tasks.map(t => ({
            id: t.id, unitId: t.unitId, kontakId: t.kontakId, dealId: t.dealId,
            deskripsi: t.deskripsi, deadline: t.deadline || '', status: t.status,
            contactName: t.contact?.nama || '', createdAt: t.createdAt || ''
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET crm/tasks');
        return json({ success: false, message: 'Gagal memuat tasks' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        deskripsi: z.string().min(1), unitId: z.coerce.number().int().positive(),
        kontakId: z.coerce.number().optional().nullable(), dealId: z.coerce.number().optional().nullable(),
        deadline: z.string().optional()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.task || body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tugas CRM tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }
        const { deskripsi, unitId, kontakId, dealId, deadline } = parsed.data;

        await db.insert(crmTasks).values({
            ownerId: userId, unitId: Number(unitId), deskripsi,
            kontakId: kontakId || null, dealId: dealId || null,
            deadline: deadline || null, status: 'pending', createdAt: new Date().toISOString()
        });
        await db.insert(riwayatAksi).values({ userId, unitId: Number(unitId), pesan: `Task baru: ${deskripsi}`, kategori: 'CRM', tipe: 'info' });
        return json({ success: true, message: 'Task berhasil dibuat' });
    } catch (err) {
        log.api.error({ err }, 'POST crm/tasks');
        return json({ success: false, message: 'Gagal buat task' }, { status: 500 });
    }
}

export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const { taskId, status } = body;
        if (!taskId || !status) return json({ success: false, message: 'taskId dan status wajib' }, { status: 400 });
        await db.update(crmTasks).set({ status }).where(eq(crmTasks.id, Number(taskId)));
        return json({ success: true, message: 'Task diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT crm/tasks');
        return json({ success: false, message: 'Gagal update task' }, { status: 500 });
    }
}
