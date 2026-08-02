import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { chartOfAccounts, unitBisnis } from '$lib/server/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { DEFAULT_COAS } from '$lib/server/defaultCoa';
import { Groq } from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import { log } from '$lib/server/logger';

const groq = new Groq({ apiKey: GROQ_API_KEY });

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
        const type = formData.get('type') || 'GENERAL';

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            // check if already has COA
            const existing = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.unitId, unit.id)).limit(1);
            if (existing.length > 0) {
                return fail(400, { message: 'Unit sudah memiliki Chart of Accounts lurd!' });
            }

            const coasToInsert = DEFAULT_COAS[type] || DEFAULT_COAS['GENERAL'];

            for (const coa of coasToInsert) {
                await db.insert(chartOfAccounts).values({
                    unitId: unit.id,
                    ...coa,
                    isActive: 1
                });
            }

            return { success: true, message: 'COA Standard berhasil dibuat jeh!' };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    },

    generateAiCoa: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const prompt = formData.get('prompt')?.toString().trim();

        if (!prompt) return fail(400, { message: 'Deskripsi bisnis wajib diisi' });

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            // check if already has COA
            const existing = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.unitId, unit.id)).limit(1);
            if (existing.length > 0) {
                return fail(400, { message: 'Unit sudah memiliki Chart of Accounts lurd!' });
            }

            const systemPrompt = `Anda adalah ahli akuntansi. Buatlah Chart of Accounts (Bagan Akun) dalam format JSON array yang murni (tanpa markdown backticks \`\`\`) berdasarkan deskripsi bisnis berikut.
Gunakan skema JSON berikut untuk setiap akun:
[
  {
    "kodeAkun": "string (misal: 1-1001)",
    "namaAkun": "string",
    "tipeAkun": "string (harus salah satu dari: ASET_LANCAR, ASET_TETAP, ASET_LAINNYA, LIABILITAS_LANCAR, LIABILITAS_JANGKA_PANJANG, EKUITAS, PENDAPATAN, HPP, BEBAN_OPERASIONAL, BEBAN_LAINNYA, PENDAPATAN_LAINNYA)",
    "normalBalance": "string (DEBIT atau KREDIT)",
    "deskripsi": "string"
  }
]
Hasilkan sekitar 10-15 akun esensial yang sangat spesifik dan relevan dengan model bisnis ini. Output HANYA JSON array saja tanpa teks lain.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Deskripsi bisnis saya: ${prompt}` }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
            });

            let responseText = completion.choices[0]?.message?.content || "[]";
            
            // bersihkan markdown backticks jika AI masih ngeyel
            responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

            const coasToInsert = JSON.parse(responseText);

            if (!Array.isArray(coasToInsert) || coasToInsert.length === 0) {
                throw new Error("AI gagal men-generate COA yang valid.");
            }

            for (const coa of coasToInsert) {
                await db.insert(chartOfAccounts).values({
                    unitId: unit.id,
                    kodeAkun: coa.kodeAkun,
                    namaAkun: coa.namaAkun,
                    tipeAkun: coa.tipeAkun,
                    normalBalance: coa.normalBalance,
                    deskripsi: coa.deskripsi || '',
                    isActive: 1
                });
            }

            return { success: true, message: 'COA Custom dari AI berhasil dibuat!' };
        } catch (err) {
            log.ai.error({ err }, 'AI Error generate COA');
            return fail(500, { message: 'Gagal generate AI: ' + err.message });
        }
    }
};
