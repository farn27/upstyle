import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmActivities, crmContacts } from '$lib/server/schema';
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

    // Load semua aktivitas
    const aktivitasList = await db.query.crmActivities.findMany({
        where: eq(crmActivities.unitId, unit.id),
        orderBy: [desc(crmActivities.tanggal)],
        with: {
            contact: true // untuk menampilkan nama kontak
        },
        limit: 100
    });

    // Load daftar kontak untuk dropdown form
    const kontakList = await db.query.crmContacts.findMany({
        where: eq(crmContacts.unitId, unit.id),
        orderBy: [desc(crmContacts.createdAt)]
    });

    return {
        unit,
        aktivitasList: JSON.parse(JSON.stringify(aktivitasList)),
        kontakList: JSON.parse(JSON.stringify(kontakList))
    };
};
