import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, API_LOGIN_LIMIT } from '$lib/server/rateLimit';
import { z } from 'zod';
import { log } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { createResetToken } from '$lib/server/emailToken';
import { sendPasswordResetEmail } from '$lib/server/email';

const forgotSchema = z.object({ email: z.string().email() });

export async function POST({ request }) {
    const ip = getClientIP(request);
    const rl = await checkRateLimit({
        key: ip,
        prefix: 'rl:api:forgot-password:ip',
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

    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
        return apiError('Email tidak valid', 400, 'INVALID_INPUT');
    }

    const email = parsed.data.email.trim().toLowerCase();
    const pesan = 'Jika email terdaftar, tautan reset sudah dikirim';
    const existing = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.email, email)).limit(1);

    // Selalu balas sukses supaya tidak bisa dipakai menebak email terdaftar
    if (existing.length === 0) {
        return apiSuccess(null, pesan);
    }

    try {
        // Sama dengan alur web: token sekali pakai di Redis + email berisi link ke halaman reset web.
        // (Dulu token hanya ditulis ke log dan email tidak pernah dikirim.)
        const token = await createResetToken(existing[0].id);
        const origin = (env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
        await sendPasswordResetEmail({
            to: email,
            username: existing[0].username,
            resetUrl: `${origin}/auth/reset-password?token=${token}`
        });
    } catch (err) {
        log.auth.warn({ err: err instanceof Error ? err.message : err }, 'Gagal kirim email reset password');
    }
    return apiSuccess(null, pesan);
}
