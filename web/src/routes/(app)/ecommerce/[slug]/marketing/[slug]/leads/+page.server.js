import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, marketingLeads, landingPages, crmContacts, crmDeals } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';

export const load = async ({ params, cookies, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    depends('marketing:leads');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `marketing_leads:${unit.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return { unit, leads: cached };

    // Drizzle join — tidak pakai db.execute raw
    const leads = await db
        .select({
            id: marketingLeads.id,
            firstName: marketingLeads.firstName,
            lastName: marketingLeads.lastName,
            email: marketingLeads.email,
            phone: marketingLeads.phone,
            notes: marketingLeads.notes,
            isTransferredToCrm: marketingLeads.isTransferredToCrm,
            createdAt: marketingLeads.createdAt,
            landingPageTitle: landingPages.title
        })
        .from(marketingLeads)
        .leftJoin(landingPages, eq(landingPages.id, marketingLeads.landingPageId))
        .where(eq(landingPages.unitId, unit.id))
        .orderBy(desc(marketingLeads.createdAt))
        .limit(100);

    await redis.set(cacheKey, leads, { ex: 180 });
    return { unit, leads };
};

export const actions = {
    transferToCrm: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const leadId = Number(data.get('lead_id'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            // Drizzle join — no raw SQL
            const leadWithPage = await db
                .select({
                    id: marketingLeads.id,
                    firstName: marketingLeads.firstName,
                    lastName: marketingLeads.lastName,
                    email: marketingLeads.email,
                    phone: marketingLeads.phone,
                    isTransferredToCrm: marketingLeads.isTransferredToCrm
                })
                .from(marketingLeads)
                .leftJoin(landingPages, eq(landingPages.id, marketingLeads.landingPageId))
                .where(and(eq(marketingLeads.id, leadId), eq(landingPages.unitId, unit.id)))
                .limit(1);

            if (!leadWithPage.length) return fail(404, { error: 'Lead tidak ditemukan' });
            const lead = leadWithPage[0];
            if (lead.isTransferredToCrm) return fail(400, { error: 'Lead sudah ditransfer sebelumnya' });

            const nama = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Lead Baru';

            await db.transaction(async (tx) => {
                // Buat kontak baru
                const contactResult = await tx.insert(crmContacts).values({
                    ownerId: userId, unitId: unit.id, nama,
                    email: lead.email || null, telepon: lead.phone || null,
                    stage: 'lead', sumber: 'landing_page'
                });
                
                const contactId = contactResult[0].insertId;

                // Buat deal baru di pipeline
                await tx.insert(crmDeals).values({
                    title: `Lead: ${nama}`,
                    unitId: unit.id,
                    contactId: contactId,
                    salesOwnerId: userId,
                    stage: 'lead_in', // stage awal pipeline
                    value: 0,
                    priority: 'medium',
                    status: 'open'
                });

                await tx.update(marketingLeads)
                    .set({ isTransferredToCrm: true })
                    .where(eq(marketingLeads.id, leadId));
            });

            // Invalidate cache
            await redis.del(`marketing_leads:${unit.id}`);

            // Pusher realtime
            pusherServer.trigger(`marketing-${slug}`, 'lead-transferred', { leadId, nama }).catch(() => {});

            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal transfer ke CRM: ' + err.message });
        }
    }
};
