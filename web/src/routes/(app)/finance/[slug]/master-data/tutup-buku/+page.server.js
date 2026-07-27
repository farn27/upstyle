import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { closingPeriods, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { nowWIB } from '$lib/server/dateUtils';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const periods = await db.select()
        .from(closingPeriods)
        .where(eq(closingPeriods.unitId, unit.id))
        .orderBy(closingPeriods.periodEnd);

    return { unit, periods };
};

export const actions = {
    closePeriod: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const start = formData.get('start')?.toString();
        const end = formData.get('end')?.toString();
        const notes = formData.get('notes')?.toString().trim() || '';

        if (!start || !end) {
            return fail(400, { message: 'Tanggal mulai & akhir periode wajib ditentukan!' });
        }

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            await db.insert(closingPeriods).values({
                unitId: unit.id,
                userId,
                periodStart: new Date(start),
                periodEnd: new Date(end),
                status: 'CLOSED',
                labaRugiPeriode: '0.00',
                keterangan: notes,
                closedAt: nowWIB()
            });

            return { success: true, message: `Periode pembukuan berhasil dikunci!` };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    }
};
