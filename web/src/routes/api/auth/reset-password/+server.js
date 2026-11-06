import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { apiSuccess, apiError, apiValidationError } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, API_LOGIN_LIMIT } from '$lib/server/rateLimit';
import { z } from 'zod';
import { consumeResetToken } from '$lib/server/emailToken';
import { hapusSemuaSesiUser } from '$lib/server/session';

const resetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(100)
});

export async function POST({ request }) {
    const ip = getClientIP(request);
    const rl = await checkRateLimit({
        key: ip,
        prefix: 'rl:api:reset-password:ip',
        ...API_LOGIN_LIMIT
    });
    if (!rl.allowed) {
        return apiError('Terlalu banyak percobaan', 429, 'RATE_LIMITED');
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return apiError('Request body harus berformat JSON', 400, 'INVALID_JSON');
    }

    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
        return apiValidationError(parsed.error, 'Data reset tidak valid');
    }

    const { token, password } = parsed.data;
    // Token sekali pakai yang sama dengan alur web (dibuat oleh /api/auth/forgot-password)
    let userId = null;
    try {
        userId = await consumeResetToken(token);
    } catch {
        userId = null;
    }
    if (!userId) return apiError('Token reset tidak valid atau kadaluarsa', 400, 'INVALID_TOKEN');

    const hashed = await argon2.hash(password);
    await db.update(users).set({ password: hashed }).where(eq(users.id, userId));
    // Password berubah → semua sesi lama (mungkin dipegang orang lain) diakhiri
    await hapusSemuaSesiUser(userId);

    return apiSuccess(null, 'Password berhasil direset');
}
