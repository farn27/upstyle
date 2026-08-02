import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { fixedAssets, chartOfAccounts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
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

        const data = await request.formData();
        const namaAset = data.get('namaAset');
        const kategori = data.get('kategori');
        const nilaiPerolehan = data.get('nilaiPerolehan');
        const tanggalPerolehan = data.get('tanggalPerolehan');
        const umurEkonomis = data.get('umurEkonomis');
        const metodePenyusutan = data.get('metodePenyusutan');
        const nilaiSisa = data.get('nilaiSisa') || 0;
        const coaId = data.get('coaId');

        try {
            await db.insert(fixedAssets).values({
                unitId: unit.id,
                namaAset,
                kategori,
                nilaiPerolehan: String(nilaiPerolehan),
                tanggalPerolehan,
                umurEkonomis: Number(umurEkonomis),
                metodePenyusutan,
                nilaiSisa: String(nilaiSisa),
                nilaiBuku: String(nilaiPerolehan),
                status: 'AKTIF',
                coaId: coaId ? Number(coaId) : null
            });
            return { success: true };
        } catch (err) {
            log.finance.error({ err }, 'Add Asset Error');
            return fail(500, { error: 'Gagal menambah aset' });
        }
    },
    editAsset: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id');
        const namaAset = data.get('namaAset');
        const kategori = data.get('kategori');
        const nilaiPerolehan = data.get('nilaiPerolehan');
        const tanggalPerolehan = data.get('tanggalPerolehan');
        const umurEkonomis = data.get('umurEkonomis');
        const metodePenyusutan = data.get('metodePenyusutan');
        const nilaiSisa = data.get('nilaiSisa') || 0;
        const coaId = data.get('coaId');
        const status = data.get('status') || 'AKTIF';

        try {
            await db.update(fixedAssets).set({
                namaAset,
                kategori,
                nilaiPerolehan: String(nilaiPerolehan),
                tanggalPerolehan,
                umurEkonomis: Number(umurEkonomis),
                metodePenyusutan,
                nilaiSisa: String(nilaiSisa),
                status,
                coaId: coaId ? Number(coaId) : null
            }).where(eq(fixedAssets.id, Number(id)));
            return { success: true };
        } catch (err) {
            log.finance.error({ err }, 'Edit Asset Error');
            return fail(500, { error: 'Gagal mengubah aset' });
        }
    },
    deleteAsset: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id');

        try {
            await db.delete(fixedAssets).where(eq(fixedAssets.id, Number(id)));
            return { success: true };
        } catch (err) {
            log.finance.error({ err }, 'Delete Asset Error');
            return fail(500, { error: 'Gagal menghapus aset' });
        }
    }
};
