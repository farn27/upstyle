import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { taxRates, chartOfAccounts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { ubahPajak, hapusPajak, MasterDataError } from '$lib/server/masterData';
import { log } from '$lib/server/logger';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const taxes = await db.query.taxRates.findMany({
        where: eq(taxRates.unitId, unit.id),
        orderBy: [desc(taxRates.id)]
    });

    const accounts = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.unitId, unit.id),
        orderBy: [chartOfAccounts.kodeAkun]
    });

    return {
        unit,
        taxes: JSON.parse(JSON.stringify(taxes)),
        accounts: JSON.parse(JSON.stringify(accounts))
    };
};

export const actions = {
    addTax: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit not found' });

        const data = await request.formData();
        const namaPajak = data.get('namaPajak');
        const persentase = data.get('persentase');
        const tipe = data.get('tipe');
        const isDefault = data.get('isDefault') === 'on' ? 1 : 0;
        const coaId = data.get('coaId');

        try {
            await db.insert(taxRates).values({
                unitId: unit.id,
                namaPajak,
                persentase: String(persentase),
                tipe,
                isDefault,
                isActive: 1,
                coaId: coaId ? Number(coaId) : null
            });
            return { success: true };
        } catch (err) {
            log.finance.error({ err }, 'Add Tax Error');
            return fail(500, { error: 'Gagal menambah pajak' });
        }
    },
    editTax: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
        const data = await request.formData();
        try {
            await ubahPajak(db, unit.id, Number(data.get('id')), {
                namaPajak: data.get('namaPajak'),
                persentase: data.get('persentase'),
                tipe: data.get('tipe'),
                // checkbox: tidak dicentang = tidak terkirim → 0
                isDefault: data.get('isDefault') === 'on' ? 1 : 0,
                isActive: data.get('isActive') === 'on' ? 1 : 0,
                coaId: data.get('coaId') || null
            });
            return { success: true };
        } catch (err) {
            if (err instanceof MasterDataError) return fail(err.status, { error: err.message });
            log.finance.error({ err }, 'Edit Tax Error');
            return fail(500, { error: 'Gagal merubah pajak' });
        }
    },
    deleteTax: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
        const data = await request.formData();
        try {
            await hapusPajak(db, unit.id, Number(data.get('id')));
            return { success: true };
        } catch (err) {
            if (err instanceof MasterDataError) return fail(err.status, { error: err.message });
            log.finance.error({ err }, 'Delete Tax Error');
            return fail(500, { error: 'Gagal menghapus pajak' });
        }
    }
};
