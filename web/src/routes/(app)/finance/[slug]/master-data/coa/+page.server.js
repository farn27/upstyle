import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { chartOfAccounts, unitBisnis } from '$lib/server/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { DEFAULT_COAS } from '$lib/server/defaultCoa';
import { isiCoaStandar, buatCoaDenganAi, MasterDataError } from '$lib/server/masterData';
import { groqChatCompletion } from '$lib/server/groq';
import { log } from '$lib/server/logger';
import { cekKuotaAI } from '$lib/server/rateLimit';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit bisnis tidak ditemukan');

    const coaList = await db.select()
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.unitId, unit.id))
        .orderBy(chartOfAccounts.kodeAkun);

    return { unit, coaList };
};

export const actions = {
    addCoa: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const kodeAkun = formData.get('kodeAkun')?.toString().trim();
        const namaAkun = formData.get('namaAkun')?.toString().trim();
        const tipeAkun = formData.get('tipeAkun')?.toString();
        const normalBalance = formData.get('normalBalance')?.toString();
        const deskripsi = formData.get('deskripsi')?.toString().trim() || '';
        const parentId = formData.get('parentId');
        const isActive = formData.get('isActive') === 'on' ? 1 : 0;

        if (!kodeAkun || !namaAkun || !tipeAkun || !normalBalance) {
            return fail(400, { message: 'Semua kolom wajib diisi kecuali deskripsi' });
        }

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit bisnis tidak ditemukan' });

            // Check if code already exists
            const existing = await db.query.chartOfAccounts.findFirst({
                where: and(
                    eq(chartOfAccounts.unitId, unit.id),
                    eq(chartOfAccounts.kodeAkun, kodeAkun)
                )
            });

            if (existing) {
                return fail(400, { message: `Kode akun "${kodeAkun}" sudah digunakan lurd!` });
            }

            await db.insert(chartOfAccounts).values({
                unitId: unit.id,
                kodeAkun,
                namaAkun,
                tipeAkun,
                normalBalance,
                deskripsi,
                parentId: parentId ? Number(parentId) : null,
                isActive
            });

            return { success: true, message: `Akun "${namaAkun}" berhasil ditambahkan!` };
        } catch (err) {
            log.finance.error({ err }, 'Add COA Error');
            return fail(500, { message: err.message });
        }
    },

    editCoa: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const kodeAkun = formData.get('kodeAkun')?.toString().trim();
        const namaAkun = formData.get('namaAkun')?.toString().trim();
        const tipeAkun = formData.get('tipeAkun')?.toString();
        const normalBalance = formData.get('normalBalance')?.toString();
        const deskripsi = formData.get('deskripsi')?.toString().trim() || '';
        const parentId = formData.get('parentId');
        const isActive = formData.get('isActive') === 'on' ? 1 : 0;

        if (!id || !kodeAkun || !namaAkun || !tipeAkun || !normalBalance) {
            return fail(400, { message: 'Semua kolom wajib diisi' });
        }

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            await db.update(chartOfAccounts)
                .set({ kodeAkun, namaAkun, tipeAkun, normalBalance, deskripsi, parentId: parentId ? Number(parentId) : null, isActive })
                .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.unitId, unit.id)));

            return { success: true, message: `Akun "${namaAkun}" berhasil diperbarui!` };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    },

    deleteCoa: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            await db.delete(chartOfAccounts)
                .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.unitId, unit.id)));

            return { success: true, message: 'Akun berhasil dihapus!' };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    },

    seedDefaultCoa: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const type = String(formData.get('type') || 'LAINNYA');

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            try {
                await isiCoaStandar(db, unit.id, type);
            } catch (e) {
                if (e instanceof MasterDataError) return fail(e.status === 409 ? 400 : e.status, { message: e.message });
                throw e;
            }
            return { success: true, message: 'COA Standard berhasil dibuat jeh!' };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    },

    generateAiCoa: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });
        const kuota = await cekKuotaAI(userId);
        if (!kuota.allowed) return fail(429, { message: kuota.pesan });

        const formData = await request.formData();
        const prompt = formData.get('prompt')?.toString().trim() || '';
        if (!prompt) return fail(400, { message: 'Deskripsi bisnis wajib diisi' });

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            // Logika sama dengan app mobile: akun divalidasi, kode unik, disimpan sekaligus (tidak setengah jadi)
            const jumlah = await buatCoaDenganAi(db, unit.id, prompt, {
                tambahkan: formData.get('tambahkan') === 'on',
                panggilAi: async (sistem, pengguna) => {
                    const res = await groqChatCompletion({
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'system', content: sistem }, { role: 'user', content: pengguna }],
                        temperature: 0.2, max_tokens: 2200
                    });
                    return res.choices?.[0]?.message?.content || '';
                }
            });
            return { success: true, message: `${jumlah} akun COA berhasil dibuat oleh AI!` };
        } catch (err) {
            if (err instanceof MasterDataError) return fail(err.status === 409 ? 400 : err.status, { message: err.message });
            log.ai.error({ err }, 'AI Error generate COA');
            return fail(500, { message: 'Gagal generate AI: ' + err.message });
        }
    }
};
