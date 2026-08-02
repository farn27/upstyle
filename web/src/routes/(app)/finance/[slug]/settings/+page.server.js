import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function load({ params, cookies }) {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw redirect(303, '/auth/login');

    try {
        const rows = await db.select()
            .from(unitBisnis)
            .where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)));

        if (rows.length === 0) {
            throw error(404, 'Bisnis tidak ditemukan atau akses ditolak');
        }

        return { unit: rows[0] };
    } catch (err) {
        if (err.status) throw err;
        log.api.error({ err }, '[Settings] Load error');
        throw error(500, 'Gagal memuat data');
    }
}

export const actions = {

    // ─── Update Identitas Bisnis ───────────────────────────────────────────────
    updateProfile: async ({ request, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Sesi berakhir, silakan login ulang.' });

        const data = await request.formData();
        const id = Number(data.get('id'));
        const nama_unit = String(data.get('nama_unit') || '').trim();
        const alamat = String(data.get('alamat') || '').trim();

        if (!id || !nama_unit) {
            return fail(400, { message: 'ID dan nama unit wajib diisi.' });
        }

        try {
            const [result] = await db.update(unitBisnis)
                .set({ namaUnit: nama_unit, alamat: alamat || null })
                .where(and(eq(unitBisnis.id, id), eq(unitBisnis.userId, userId)));

            if (result.affectedRows === 0) {
                return fail(403, { message: 'Gagal: Anda tidak memiliki akses ke data ini.' });
            }

            return { success: true, message: 'Profil berhasil diperbarui!' };
        } catch (err) {
            log.api.error({ err }, '[Settings] updateProfile error');
            return fail(500, { message: 'Terjadi kesalahan database.' });
        }
    },

    // ─── Generate / Regenerate Link Portal Staff ───────────────────────────────
    updatePortal: async ({ request, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Sesi berakhir, silakan login ulang.' });

        const data = await request.formData();
        const id = Number(data.get('id'));
        const namaUnit = String(data.get('nama_unit') || '').trim();

        if (!id || !namaUnit) {
            return fail(400, { message: 'Data tidak lengkap.' });
        }

        // Verifikasi kepemilikan dulu
        const existing = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, id), eq(unitBisnis.userId, userId)),
            columns: { id: true }
        });
        if (!existing) {
            return fail(403, { message: 'Akses ditolak.' });
        }

        // Format: nama-bisnis-xxxxx (5 char random alphanumeric)
        const cleanName = namaUnit
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .substring(0, 30); // max 30 char

        const randomHash = Math.random().toString(36).substring(2, 7);
        const finalSlug = `${cleanName}-${randomHash}`;

        try {
            await db.update(unitBisnis)
                .set({ loginSlug: finalSlug })
                .where(eq(unitBisnis.id, id));

            return { success: true, message: `Link portal berhasil dibuat: /portal/${finalSlug}` };
        } catch (err) {
            log.api.error({ err }, '[Settings] updatePortal error');
            return fail(500, { message: 'Gagal membuat link portal.' });
        }
    }
};
