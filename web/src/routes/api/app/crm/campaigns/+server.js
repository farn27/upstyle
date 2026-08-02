import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmContacts, crmDeals, crmActivities, crmTasks, quotations, quotationItems, salesOrders, salesOrderItems, marketingCampaigns } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// GET: ?unitId= - fetch marketing campaigns for unit, ordered by createdAt desc
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });

    try {
        const data = await db.query.marketingCampaigns.findMany({
            where: eq(marketingCampaigns.unitId, Number(unitId)),
            orderBy: [desc(marketingCampaigns.createdAt)]
        });

        return json({ success: true, message: 'Berhasil mengambil data marketing campaign', data });
    } catch (err) {
        log.crm.error({ err }, 'API GET MARKETING CAMPAIGNS ERROR');
        return json({ success: false, message: 'Gagal mengambil data campaign: ' + err.message, data: null }, { status: 500 });
    }
}

// POST: Create campaign. Body: { unitId, name, type, budget, composeSubject, composeText, scheduledAt }. Set status='DRAFT'.
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, name, type, budget, composeSubject, composeText, scheduledAt } = body;

        if (!unitId || !name || !type) {
            return json({ success: false, message: 'unitId, name, dan type wajib diisi', data: null }, { status: 400 });
        }

        const [result] = await db.insert(marketingCampaigns).values({
            unitId: Number(unitId),
            name,
            type,
            status: 'DRAFT',
            budget: budget !== undefined ? String(budget) : '0.00',
            composeSubject: composeSubject || null,
            composeText: composeText || null,
            scheduledAt: scheduledAt || null
        });

        return json({
            success: true,
            message: 'Campaign berhasil dibuat',
            data: { id: result.insertId }
        });
    } catch (err) {
        log.crm.error({ err }, 'API POST MARKETING CAMPAIGNS ERROR');
        return json({ success: false, message: 'Gagal membuat campaign: ' + err.message, data: null }, { status: 500 });
    }
}

// PUT: Update campaign. Body: { id, status, composeText, scheduledAt }.
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { id, status, composeText, scheduledAt } = body;

        if (!id) {
            return json({ success: false, message: 'id campaign wajib diisi', data: null }, { status: 400 });
        }

        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (composeText !== undefined) updateData.composeText = composeText;
        if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;

        if (Object.keys(updateData).length === 0) {
            return json({ success: false, message: 'Tidak ada data yang diperbarui', data: null }, { status: 400 });
        }

        await db.update(marketingCampaigns)
            .set(updateData)
            .where(eq(marketingCampaigns.id, Number(id)));

        return json({ success: true, message: 'Campaign berhasil diperbarui', data: null });
    } catch (err) {
        log.crm.error({ err }, 'API PUT MARKETING CAMPAIGNS ERROR');
        return json({ success: false, message: 'Gagal memperbarui campaign: ' + err.message, data: null }, { status: 500 });
    }
}
