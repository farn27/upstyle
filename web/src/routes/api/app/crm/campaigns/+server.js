import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { marketingCampaigns, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    try {
        const campaigns = await db.query.marketingCampaigns.findMany({
            where: eq(marketingCampaigns.unitId, Number(unitId)),
            orderBy: [desc(marketingCampaigns.id)]
        });
        const data = campaigns.map(c => ({
            id: c.id, unitId: c.unitId, name: c.name, type: c.type, status: c.status,
            budget: Number(c.budget || 0), composeSubject: c.composeSubject || '',
            composeText: c.composeText || '', scheduledAt: c.scheduledAt || '',
            createdAt: c.createdAt || ''
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET crm/campaigns');
        return json({ success: false, message: 'Gagal memuat kampanye' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const schema = z.object({
        name: z.string().min(1), unitId: z.coerce.number().int().positive(),
        type: z.enum(['EMAIL','WA','AD_TRACKER']),
        budget: z.coerce.number().optional().default(0),
        composeSubject: z.string().optional(), composeText: z.string().optional()
    });
    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.campaign || body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input kampanye tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }
        const { name, unitId, type, budget, composeSubject, composeText } = parsed.data;
        await db.insert(marketingCampaigns).values({
            unitId: Number(unitId), name, type, status: 'DRAFT',
            budget: String(budget), composeSubject: composeSubject || null,
            composeText: composeText || null, createdAt: new Date().toISOString()
        });
        await db.insert(riwayatAksi).values({ userId, unitId: Number(unitId), pesan: `Kampanye baru: ${name}`, kategori: 'MARKETING', tipe: 'success' });
        return json({ success: true, message: 'Kampanye berhasil dibuat' });
    } catch (err) {
        log.api.error({ err }, 'POST crm/campaigns');
        return json({ success: false, message: 'Gagal buat kampanye' }, { status: 500 });
    }
}
