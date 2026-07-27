import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmDeals, crmContacts, crmCompanies } from '$lib/server/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Load semua deals / pipeline
    const dealsList = await db.query.crmDeals.findMany({
        where: eq(crmDeals.unitId, unit.id),
        orderBy: [desc(crmDeals.createdAt)],
        with: {
            contact: true // relasi ke kontak
        }
    });

    // Load kontak untuk form tambah deal
    const kontakList = await db.query.crmContacts.findMany({
        where: eq(crmContacts.unitId, unit.id),
        orderBy: [desc(crmContacts.createdAt)]
    });

    const companyList = await db.query.crmCompanies.findMany({
        where: eq(crmCompanies.unitId, unit.id),
        orderBy: [desc(crmCompanies.createdAt)]
    });

    return {
        unit,
        dealsList: JSON.parse(JSON.stringify(dealsList)),
        kontakList: JSON.parse(JSON.stringify(kontakList)),
        companyList: JSON.parse(JSON.stringify(companyList))
    };
};

export const actions = {
    updateStage: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return { success: false, message: 'Silakan login ulang' };

        const formData = await request.formData();
        const dealId = formData.get('dealId');
        const newStage = formData.get('newStage');

        if (!dealId || !newStage) return { success: false, message: 'Data tidak lengkap' };

        try {
            const updateData = { stage: newStage };
            if (newStage === 'won') {
                updateData.status = 'won';
            } else {
                updateData.status = 'open';
            }

            await db.update(crmDeals)
                .set(updateData)
                .where(eq(crmDeals.id, Number(dealId)));

            return { success: true, message: 'Status Deal berhasil diperbarui' };
        } catch (e) {
            console.error('Update deal error', e);
            return { success: false, message: 'Terjadi kesalahan sistem' };
        }
    },
    createDeal: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return { success: false, message: 'Silakan login ulang' };

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return { success: false, message: 'Unit tidak valid' };

        const formData = await request.formData();
        const namaDeal = formData.get('namaDeal');
        const contactId = formData.get('contactId');
        const companyId = formData.get('companyId');
        const stage = formData.get('stage') || 'prospek';
        const nilai = formData.get('nilai');

        if (!namaDeal || !nilai) return { success: false, message: 'Data tidak lengkap' };

        try {
            await db.insert(crmDeals).values({
                ownerId: userId,
                unitId: unit.id,
                namaDeal: namaDeal.toString(),
                kontakId: contactId ? Number(contactId) : null,
                companyId: companyId ? Number(companyId) : null,
                nilai: nilai.toString(),
                stage: stage.toString(),
                status: stage === 'won' ? 'won' : 'open'
            });

            return { success: true, message: 'Deal berhasil ditambahkan' };
        } catch (e) {
            console.error('Create deal error', e);
            return { success: false, message: 'Terjadi kesalahan sistem' };
        }
    }
};
