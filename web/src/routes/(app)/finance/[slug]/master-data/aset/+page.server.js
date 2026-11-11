import { error, fail } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { fixedAssets, chartOfAccounts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { ubahAset, hapusAset, buatAset, MasterDataError } from '$lib/server/masterData';
import { log } from '$lib/server/logger';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const assets = await db.query.fixedAssets.findMany({
        where: eq(fixedAssets.unitId, unit.id),
        orderBy: [desc(fixedAssets.id)]
    });

    const accounts = await db.query.chartOfAccounts.findMany({
        where: and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.tipeAkun, 'ASET_TETAP')),
        orderBy: [chartOfAccounts.kodeAkun]
    });

    return {
        unit,
        assets: JSON.parse(JSON.stringify(assets)),
        accounts: JSON.parse(JSON.stringify(accounts))
    };
};

export const actions = {
    addAsset: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit not found' });

        const data = Object.fromEntries(await request.formData());
        try {
            await buatAset(db, unit.id, data);
            return { success: true };
        } catch (err) {
            if (err instanceof MasterDataError) return fail(err.status, { error: pesanAman(err) });
            log.finance.error({ err }, 'Add Asset Error');
            return fail(500, { error: 'Gagal menambah aset' });
        }
    },
    editAsset: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
        const data = Object.fromEntries(await request.formData());
        try {
            const { id, ...isi } = data;
            if (!(Number(id) > 0)) return fail(400, { error: 'Aset tidak valid' });
            // sama dengan form lama: COA kosong = dilepas, nilai sisa kosong = 0, status default AKTIF
            await ubahAset(db, unit.id, Number(id), { ...isi, coaId: isi.coaId || null, nilaiSisa: isi.nilaiSisa || 0, status: isi.status || 'AKTIF' });
            return { success: true };
        } catch (err) {
            if (err instanceof MasterDataError) return fail(err.status, { error: pesanAman(err) });
            log.finance.error({ err }, 'Edit Asset Error');
            return fail(500, { error: 'Gagal mengubah aset' });
        }
    },
    deleteAsset: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
        const data = await request.formData();
        try {
            await hapusAset(db, unit.id, Number(data.get('id')));
            return { success: true };
        } catch (err) {
            if (err instanceof MasterDataError) return fail(err.status, { error: pesanAman(err) });
            log.finance.error({ err }, 'Delete Asset Error');
            return fail(500, { error: 'Gagal menghapus aset' });
        }
    }
};
