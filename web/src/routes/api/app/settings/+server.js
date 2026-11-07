import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users, riwayatAksi } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import argon2 from 'argon2';

// GET /api/app/settings/profile
/** Riwayat hanya dicatat bila user punya unit (FK unit_id); kegagalan log tidak boleh menggagalkan simpan. */
async function catatRiwayat(userId, unitId, pesan) {
    if (!unitId) return;
    try {
        await db.insert(riwayatAksi).values({ userId, unitId, pesan, kategori: 'SETTINGS', tipe: 'info' });
    } catch (e) { console.error('catatRiwayat gagal', e?.message); }
}

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    const mode = url.searchParams.get('mode') || 'profile';

    try {
        if (mode === 'profile') {
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    companyId: true,
                    createdAt: true,
                    emailVerifiedAt: true
                }
            });

            if (!user) return apiUnauthorized('User tidak ditemukan');

            const data = {
                id: user.id,
                username: user.username || '',
                email: user.email || '',
                name: user.username || '',
                phone: '',
                role: user.role || 'free',
                companyId: user.companyId ?? null,
                createdAt: user.createdAt || '',
                emailVerifiedAt: user.emailVerifiedAt || null
            };

            return apiSuccess(data, 'Profil berhasil dimuat');
        }

        return apiError('Mode tidak didukung', 400);
    } catch (err) {
        log.api.error({ err }, 'GET /api/app/settings');
        return apiError('Gagal memuat pengaturan', 500);
    }
}

// PUT /api/app/settings
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    try {
        const body = await request.json();
        const mode = String(body?.mode || '').trim();

        if (mode === 'profile') {
            const schema = z.object({
                name: z.string().min(1).max(100).optional(),
                email: z.string().email().optional(),
                phone: z.string().optional()
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Data profil tidak valid';
                return apiError(msg, 422);
            }

            const { name, email, phone } = parsed.data;

            const existing = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { id: true, email: true, companyId: true }
            });
            if (!existing) return apiUnauthorized('User tidak ditemukan');

            const updateData = {};
            if (name !== undefined) updateData.username = name;
            if (email !== undefined) updateData.email = email;

            await db.update(users).set(updateData).where(eq(users.id, userId));

            await catatRiwayat(userId, existing.companyId, 'Profil pengguna diperbarui');

            return apiSuccess({ message: 'Profil berhasil diperbarui' }, 'OK');
        }

        if (mode === 'password') {
            const schema = z.object({
                currentPassword: z.string().min(1, 'Kata sandi lama wajib diisi'),
                newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter')
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Data kata sandi tidak valid';
                return apiError(msg, 422);
            }

            const { currentPassword, newPassword } = parsed.data;

            const [user] = await db.select({ id: users.id, password: users.password, companyId: users.companyId })
               	.from(users)
               	.where(eq(users.id, userId));

            if (!user) return apiError('User tidak ditemukan', 404);
            if (!user.password) return apiError('Akun ini login via Google dan tidak punya kata sandi lokal', 400);

            // Kata sandi tersimpan sebagai hash argon2 (sama dengan login & halaman pengaturan web).
            // Dulu dibandingkan sebagai teks biasa sehingga selalu 'tidak cocok' — dan bila lolos akan menyimpan teks biasa.
            let ok = false;
            try { ok = await argon2.verify(user.password, currentPassword); } catch { ok = false; }
            if (!ok) return apiError('Kata sandi lama tidak cocok', 400, 'INVALID_CREDENTIALS');

            await db.update(users)
               	.set({ password: await argon2.hash(newPassword) })
               	.where(eq(users.id, userId));

            await catatRiwayat(userId, user.companyId, 'Kata sandi diubah');

            return apiSuccess({ message: 'Kata sandi berhasil diubah' }, 'OK');
        }

        if (mode === 'preferences') {
            const schema = z.object({
                darkMode: z.boolean().optional(),
                notifPref: z.boolean().optional()
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Preferensi tidak valid';
                return apiError(msg, 422);
            }

            return apiSuccess({ message: 'Preferensi berhasil disimpan' }, 'OK');
        }

        return apiError('Mode pengaturan tidak didukung', 400);
    } catch (err) {
        log.api.error({ err }, 'PUT /api/app/settings');
        return apiError('Gagal memperbarui pengaturan', 500);
    }
}
