import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ params, cookies }) {
    const userId = await getCurrentUserId(cookies);
    
    if (!userId) throw redirect(303, '/auth/login');

    try {
        // Ambil data unit bisnis yang slug-nya cocok DAN milik user ini
        const rows = await db.select()
            .from(unitBisnis)
            .where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)));

        if (rows.length === 0) {
            // Jika tidak ketemu, berarti slug salah atau itu milik user lain
            throw error(404, 'Bisnis tidak ditemukan atau akses ditolak');
        }

        return {
            unit: rows[0] 
        };
    } catch (err) {
        if (err.status) throw err;
        console.error("Load Error:", err);
        throw error(500, 'Gagal memuat data');
    }
}

export const actions = {
    // Aksi Update Profil (Nama & Alamat)
updateProfile: async ({ request, cookies }) => {
        const data = await request.formData();
        const id = data.get('id');
        const nama_unit = data.get('nama_unit');
        const alamat = data.get('alamat');
        
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Sesi berakhir, silakan login ulang.' });

        try {
            // Update hanya jika ID Bisnis cocok DAN milik User yang sedang login
            const [result] = await db.update(unitBisnis)
                .set({ namaUnit: nama_unit, alamat: alamat })
                .where(and(eq(unitBisnis.id, id), eq(unitBisnis.userId, userId)));

            if (result.affectedRows === 0) {
                return fail(403, { message: 'Gagal: Anda tidak memiliki akses ke data ini.' });
            }

            return { success: true, message: 'Profil berhasil diperbarui!' };
        } catch (err) {
            console.error(err);
            return fail(500, { message: 'Terjadi kesalahan database.' });
        }
    },

    // Aksi Update Link Portal
updatePortal: async ({ request, cookies }) => {
    const data = await request.formData();
    const id = data.get('id'); 
    const namaUnit = data.get('nama_unit'); // Ambil nama asli bisnisnya
    const userId = await getCurrentUserId(cookies);
    if (!userId) return fail(401, { message: 'Sesi berakhir, silakan login ulang.' });

    // 1. Buat format nama yang rapi (lowercase & tanpa spasi)
    const cleanName = namaUnit.toLowerCase().trim().replace(/\s+/g, '-');
    
    // 2. Generate 5 karakter acak unik
    const randomHash = Math.random().toString(36).substring(2, 7); 
    
    // 3. Gabungkan: cafe-mokondo-x7y2z
    const finalSlug = `${cleanName}-${randomHash}`;

    try {
        await db.update(unitBisnis)
            .set({ loginSlug: finalSlug })
            .where(and(eq(unitBisnis.id, id), eq(unitBisnis.userId, userId)));
        return { success: true, message: 'Link portal baru berhasil dibuat!' };
    } catch (err) {
        return fail(500, { message: 'Gagal membuat link.' });
    }
}
};