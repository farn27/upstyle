import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, API_LOGIN_LIMIT } from '$lib/server/rateLimit';
import { z } from 'zod';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

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
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

    // Always return success to avoid user enumeration
    if (existing.length === 0) {
        return apiSuccess(null, 'Jika email terdaftar, tautan reset sudah dikirim');
    }

    const token = crypto.randomUUID();
    const payload = JSON.stringify({ userId: existing[0].id, email });
    try {
        if (!redis) throw new Error('Redis tidak tersedia');
        await redis.set(`pwdreset:${token}`, payload, { ex: 60 * 15 }); // 15 min
    } catch (err) {
        log.auth.warn({ err }, 'Gagal simpan token reset');
        return apiError('Gagal menyimpan token reset', 500, 'REDIS_ERROR');
    }

    // TODO: kirim email via SMTP/provider. Untuk dev, log saja.
    log.auth.info({ email, token }, 'Password reset token generated');
    return apiSuccess(null, 'Jika email terdaftar, tautan reset sudah dikirim');
}
