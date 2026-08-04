import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { apiSuccess, apiError, apiValidationError } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, API_LOGIN_LIMIT } from '$lib/server/rateLimit';
import { z } from 'zod';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';

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
    let stored;
    try {
        if (!redis) throw new Error('Redis tidak tersedia');
        const raw = await redis.get(`pwdreset:${token}`);
        if (!raw) return apiError('Token reset tidak valid atau kadaluarsa', 400, 'INVALID_TOKEN');
        stored = JSON.parse(raw);
    } catch {
        return apiError('Token reset tidak valid', 400, 'INVALID_TOKEN');
    }

    const hashed = await argon2.hash(password);
    await db.update(users).set({ password: hashed }).where(eq(users.id, stored.userId));
    await redis.del(`pwdreset:${token}`);

    return apiSuccess(null, 'Password berhasil direset');
}
