import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { peekResetToken, consumeResetToken } from '$lib/server/emailToken';
import { checkRateLimit, getClientIP } from '$lib/server/rateLimit';
import { z } from 'zod';
import argon2 from 'argon2';

const resetSchema = z.object({
	password: z
		.string()
		.min(8, 'Password minimal 8 karakter')
		.max(255, 'Password terlalu panjang'),
	confirm_password: z.string()
}).refine((d) => d.password === d.confirm_password, {
	message: 'Password dan konfirmasi tidak cocok',
	path: ['confirm_password']
});

export async function load({ url }) {
	const token = url.searchParams.get('token');

	if (!token) {
		return { valid: false, message: 'Token tidak ditemukan.' };
	}

	const userId = await peekResetToken(token);
	if (!userId) {
		return { valid: false, message: 'Link reset sudah kadaluarsa atau tidak valid.' };
	}

	return { valid: true, token };
}

export const actions = {
	default: async ({ request }) => {
		const ip = getClientIP(request);
		const rl = await checkRateLimit({
			key: ip,
			prefix: 'rl:reset-pw:ip',
			limit: 10,
			windowSec: 60 * 15
		});
		if (!rl.allowed) {
			return fail(429, { message: 'Terlalu banyak percobaan. Coba lagi nanti.' });
		}

		const data = await request.formData();
		const token = String(data.get('token') || '');
		const raw = {
			password: data.get('password'),
			confirm_password: data.get('confirm_password')
		};

		const parsed = resetSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				message: parsed.error.errors[0]?.message,
				token
			});
		}

		// Consume token (one-time use)
		const userId = await consumeResetToken(token);
		if (!userId) {
			return fail(400, {
				message: 'Link reset sudah kadaluarsa atau sudah digunakan. Minta link baru.',
				token
			});
		}

		try {
			const hashedPassword = await argon2.hash(parsed.data.password);
			await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
		} catch (err) {
			console.error('[ResetPassword] Error:', err);
			return fail(500, { message: 'Terjadi kesalahan. Coba lagi nanti.', token });
		}

		throw redirect(303, '/auth/login?reset=success');
	}
};
