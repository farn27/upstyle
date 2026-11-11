import { json } from '@sveltejs/kit';
import { nowSqlWIB } from '$lib/server/dateUtils';
import { db } from '$lib/server/drizzle';
import { crmTasks, crmContacts, crmDeals, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { z } from 'zod';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const tasksRaw = await db.select().from(crmTasks).where(eq(crmTasks.unitId, Number(unitId))).orderBy(desc(crmTasks.id));
        const idKontak = [...new Set(tasksRaw.map((t) => t.kontakId).filter((x) => x != null))];
        const kontakRows = idKontak.length
            ? await db.select().from(crmContacts).where(and(eq(crmContacts.unitId, Number(unitId)), inArray(crmContacts.id, /** @type {number[]} */ (idKontak))))
            : [];
        const petaKontak = new Map(kontakRows.map((c) => [c.id, c]));
        const tasks = tasksRaw.map((t) => ({ ...t, contact: t.kontakId != null ? petaKontak.get(t.kontakId) || null : null }));
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

        // Kontak / deal yang ditautkan harus milik unit ini (bukan unit orang lain).
        if (kontakId) {
            const k = await db.query.crmContacts.findFirst({ where: and(eq(crmContacts.id, Number(kontakId)), eq(crmContacts.unitId, unitId)), columns: { id: true } });
            if (!k) return json({ success: false, message: 'Kontak tidak ditemukan di unit ini' }, { status: 404 });
        }
        if (dealId) {
            const d = await db.query.crmDeals.findFirst({ where: and(eq(crmDeals.id, Number(dealId)), eq(crmDeals.unitId, unitId)), columns: { id: true } });
            if (!d) return json({ success: false, message: 'Deal tidak ditemukan di unit ini' }, { status: 404 });
        }

        await db.insert(crmTasks).values({
            ownerId: userId, unitId: Number(unitId), deskripsi,
            kontakId: kontakId || null, dealId: dealId || null,
            deadline: deadline || null, status: 'pending', createdAt: nowSqlWIB()
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
        const { taskId, status, deskripsi, deadline } = body;
        if (!taskId || (!status && deskripsi === undefined && deadline === undefined)) {
            return json({ success: false, message: 'taskId dan status wajib' }, { status: 400 });
        }
        if (status && !['pending', 'done'].includes(status)) {
            return json({ success: false, message: 'Status harus pending atau done' }, { status: 400 });
        }
        const task = await db.query.crmTasks.findFirst({ where: eq(crmTasks.id, Number(taskId)) });
        if (!task || !(await unitMilikUser(db, userId, task.unitId))) {
            return json({ success: false, message: 'Task tidak ditemukan' }, { status: 404 });
        }
        /** @type {Record<string, any>} */
        const ubah = {};
        if (status) ubah.status = status;
        if (deskripsi !== undefined) {
            const d = String(deskripsi).trim();
            if (!d) return json({ success: false, message: 'Deskripsi tugas wajib diisi' }, { status: 400 });
            ubah.deskripsi = d;
        }
        if (deadline !== undefined) ubah.deadline = deadline || null;
        await db.update(crmTasks).set(ubah).where(eq(crmTasks.id, Number(taskId)));
        return json({ success: true, message: 'Task diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT crm/tasks');
        return json({ success: false, message: 'Gagal update task' }, { status: 500 });
    }
}

export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const taskId = Number(url.searchParams.get('taskId'));
    if (!taskId) return json({ success: false, message: 'taskId wajib' }, { status: 400 });
    try {
        const task = await db.query.crmTasks.findFirst({ where: eq(crmTasks.id, taskId) });
        if (!task || !(await unitMilikUser(db, userId, task.unitId))) {
            return json({ success: false, message: 'Task tidak ditemukan' }, { status: 404 });
        }
        await db.delete(crmTasks).where(eq(crmTasks.id, taskId));
        return json({ success: true, message: 'Task dihapus' });
    } catch (err) {
        log.api.error({ err }, 'DELETE crm/tasks');
        return json({ success: false, message: 'Gagal hapus task' }, { status: 500 });
    }
}
