import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { marketingCampaigns, marketingLeads, adTrackers, landingPages, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET: Fetch marketing data (campaigns, leads, ad-trackers)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const type = url.searchParams.get('type') || 'all';

        if (type === 'campaigns') {
            const campaigns = await db.select()
                .from(marketingCampaigns)
                .where(eq(marketingCampaigns.unitId, Number(unitId)))
                .orderBy(desc(marketingCampaigns.id));

            return json({ 
                success: true, 
                campaigns: campaigns.map(c => ({
                    id: c.id,
                    unitId: c.unitId,
                    name: c.name,
                    type: c.type,
                    status: c.status,
                    budget: Number(c.budget || 0),
                    composeSubject: c.composeSubject || '',
                    composeText: c.composeText || '',
                    scheduledAt: c.scheduledAt || '',
                    createdAt: c.createdAt || ''
                }))
            });
        }

        if (type === 'leads') {
            const leads = await db.select()
                .from(marketingLeads)
                .orderBy(desc(marketingLeads.id))
                .limit(100);

            return json({ 
                success: true, 
                leads: leads.map(l => ({
                    id: l.id,
                    landingPageId: l.landingPageId,
                    firstName: l.firstName || '',
                    lastName: l.lastName || '',
                    email: l.email || '',
                    phone: l.phone || '',
                    notes: l.notes || '',
                    isTransferredToCrm: l.isTransferredToCrm || false,
                    createdAt: l.createdAt || ''
                }))
            });
        }

        if (type === 'ad-trackers') {
            const trackers = await db.select()
                .from(adTrackers)
                .where(eq(adTrackers.unitId, Number(unitId)))
                .orderBy(desc(adTrackers.trackingDate));

            return json({ 
                success: true, 
                adTrackers: trackers.map(t => ({
                    id: t.id,
                    unitId: t.unitId,
                    platform: t.platform,
                    spendAmount: Number(t.spendAmount || 0),
                    impressions: t.impressions || 0,
                    clicks: t.clicks || 0,
                    conversions: t.conversions || 0,
                    trackingDate: t.trackingDate,
                    createdAt: t.createdAt || ''
                }))
            });
        }

        // Default: return all
        const campaigns = await db.select()
            .from(marketingCampaigns)
            .where(eq(marketingCampaigns.unitId, Number(unitId)))
            .orderBy(desc(marketingCampaigns.id))
            .limit(20);

        const leads = await db.select()
            .from(marketingLeads)
            .orderBy(desc(marketingLeads.id))
            .limit(50);

        const trackers = await db.select()
            .from(adTrackers)
            .where(eq(adTrackers.unitId, Number(unitId)))
            .orderBy(desc(adTrackers.trackingDate))
            .limit(30);

        return json({ 
            success: true, 
            data: {
                campaigns: campaigns.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    status: c.status,
                    budget: Number(c.budget || 0)
                })),
                leads: leads.map(l => ({
                    id: l.id,
                    firstName: l.firstName || '',
                    lastName: l.lastName || '',
                    email: l.email || '',
                    phone: l.phone || ''
                })),
                adTrackers: trackers.map(t => ({
                    id: t.id,
                    platform: t.platform,
                    spendAmount: Number(t.spendAmount || 0),
                    clicks: t.clicks || 0,
                    conversions: t.conversions || 0
                }))
            }
        });

    } catch (err) {
        log.api.error({ err }, 'GET marketing error');
        return json({ success: false, message: 'Gagal mengambil data marketing' }, { status: 500 });
    }
}

// POST: Create campaign, lead, or ad-tracker
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        // ─── Zod validation ──────────────────────────────────────────────────
        if (action === 'create-campaign') {
            const schema = z.object({
                action: z.literal('create-campaign'),
                campaign: z.object({
                    unitId: z.coerce.number().int().positive(),
                    name: z.string().min(1, 'Nama campaign wajib diisi').max(150),
                    type: z.enum(['EMAIL', 'WA', 'AD_TRACKER']),
                    status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED']).default('DRAFT'),
                    budget: z.coerce.number().min(0).default(0),
                    composeSubject: z.string().optional(),
                    composeText: z.string().optional(),
                    scheduledAt: z.string().optional()
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input campaign tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'create-lead') {
            const schema = z.object({
                action: z.literal('create-lead'),
                lead: z.object({
                    landingPageId: z.coerce.number().int().optional(),
                    firstName: z.string().min(1, 'First name wajib diisi').max(100),
                    lastName: z.string().max(100).optional(),
                    email: z.string().email().optional().or(z.literal('')),
                    phone: z.string().max(30).optional(),
                    notes: z.string().optional()
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input lead tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'create-ad-tracker') {
            const schema = z.object({
                action: z.literal('create-ad-tracker'),
                tracker: z.object({
                    unitId: z.coerce.number().int().positive(),
                    platform: z.string().min(1, 'Platform wajib diisi').max(50),
                    spendAmount: z.coerce.number().min(0),
                    impressions: z.coerce.number().int().min(0).default(0),
                    clicks: z.coerce.number().int().min(0).default(0),
                    conversions: z.coerce.number().int().min(0).default(0),
                    trackingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input tracker tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        if (action === 'create-campaign') {
            const { unitId, name, type, status, budget, composeSubject, composeText, scheduledAt } = body.campaign;

            const [result] = await db.insert(marketingCampaigns).values({
                unitId: Number(unitId),
                name,
                type,
                status: status || 'DRAFT',
                budget: String(budget || 0),
                composeSubject: composeSubject || null,
                composeText: composeText || null,
                scheduledAt: scheduledAt || null
            });

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Campaign marketing dibuat: ${name}`,
                kategori: 'MARKETING',
                tipe: 'success'
            });

            return json({ 
                success: true, 
                message: 'Campaign berhasil dibuat',
                data: { id: result.insertId }
            });
        }

        if (action === 'create-lead') {
            const { landingPageId, firstName, lastName, email, phone, notes } = body.lead;

            const [result] = await db.insert(marketingLeads).values({
                landingPageId: landingPageId || null,
                firstName,
                lastName: lastName || null,
                email: email || null,
                phone: phone || null,
                notes: notes || null,
                isTransferredToCrm: false
            });

            return json({ 
                success: true, 
                message: 'Lead berhasil ditambahkan',
                data: { id: result.insertId }
            });
        }

        if (action === 'create-ad-tracker') {
            const { unitId, platform, spendAmount, impressions, clicks, conversions, trackingDate } = body.tracker;

            const [result] = await db.insert(adTrackers).values({
                unitId: Number(unitId),
                platform,
                spendAmount: String(spendAmount),
                impressions: impressions || 0,
                clicks: clicks || 0,
                conversions: conversions || 0,
                trackingDate
            });

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Ad tracker ditambahkan: ${platform} - ${trackingDate}`,
                kategori: 'MARKETING',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: 'Ad tracker berhasil ditambahkan',
                data: { id: result.insertId }
            });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'POST marketing error');
        return json({ success: false, message: 'Gagal memproses marketing: ' + err.message }, { status: 500 });
    }
}

// PUT: Update campaign or lead
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'update-campaign-status') {
            const { campaignId, status, unitId } = body;

            if (!campaignId || !status) {
                return json({ success: false, message: 'campaignId dan status wajib diisi' }, { status: 400 });
            }

            await db.update(marketingCampaigns)
                .set({ status })
                .where(eq(marketingCampaigns.id, Number(campaignId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Status campaign diubah ke ${status}`,
                kategori: 'MARKETING',
                tipe: 'info'
            });

            return json({ success: true, message: 'Status campaign berhasil diubah' });
        }

        if (action === 'transfer-lead-to-crm') {
            const { leadId, unitId } = body;

            if (!leadId) {
                return json({ success: false, message: 'leadId wajib diisi' }, { status: 400 });
            }

            await db.update(marketingLeads)
                .set({ isTransferredToCrm: true })
                .where(eq(marketingLeads.id, Number(leadId)));

            return json({ success: true, message: 'Lead berhasil ditransfer ke CRM' });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT marketing error');
        return json({ success: false, message: 'Gagal update marketing' }, { status: 500 });
    }
}

// DELETE: Delete campaign or tracker
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    const unitId = url.searchParams.get('unitId');

    if (!type || !id) {
        return json({ success: false, message: 'type dan id wajib diisi' }, { status: 400 });
    }

    try {
        if (type === 'campaign') {
            await db.delete(marketingCampaigns)
                .where(eq(marketingCampaigns.id, Number(id)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Campaign dihapus',
                kategori: 'MARKETING',
                tipe: 'warning'
            });

            return json({ success: true, message: 'Campaign berhasil dihapus' });
        }

        if (type === 'tracker') {
            await db.delete(adTrackers)
                .where(eq(adTrackers.id, Number(id)));

            return json({ success: true, message: 'Ad tracker berhasil dihapus' });
        }

        if (type === 'lead') {
            await db.delete(marketingLeads)
                .where(eq(marketingLeads.id, Number(id)));

            return json({ success: true, message: 'Lead berhasil dihapus' });
        }

        return json({ success: false, message: 'Type tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'DELETE marketing error');
        return json({ success: false, message: 'Gagal menghapus data marketing' }, { status: 500 });
    }
}
