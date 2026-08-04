import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users, riwayatAksi } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/settings/profile
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
                columns: { id: true, email: true }
            });
            if (!existing) return apiUnauthorized('User tidak ditemukan');

            const updateData = {};
            if (name !== undefined) updateData.username = name;
            if (email !== undefined) updateData.email = email;

            await db.update(users).set(updateData).where(eq(users.id, userId));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: existing.companyId ?? 0,
                pesan: 'Profil pengguna diperbarui',
                kategori: 'SETTINGS',
                tipe: 'info'
            });

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

            const [user] = await db.select({ id: true, password: true, companyId: true })
               	.from(users)
               	.where(eq(users.id, userId));

            if (!user || !user.password) {
                return apiError('User tidak ditemukan atau tidak memiliki kata sandi', 404);
            }

            const ok = currentPassword === user.password;
            if (!ok) return apiError('Kata sandi lama tidak cocok', 400, 'INVALID_CREDENTIALS');

            await db.update(users)
               	.set({ password: newPassword })
               	.where(eq(users.id, userId));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: user.companyId ?? 0,
                pesan: 'Kata sandi diubah',
                kategori: 'SETTINGS',
                tipe: 'warning'
            });

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
