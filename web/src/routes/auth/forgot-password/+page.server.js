import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { createResetToken } from '$lib/server/emailToken';
import { sendPasswordResetEmail } from '$lib/server/email';
import { checkRateLimit, getClientIP } from '$lib/server/rateLimit';
import { env } from '$env/dynamic/private';
import { z } from 'zod';

const emailSchema = z.object({
	email: z.string().email('Format email tidak valid').max(100).toLowerCase().trim()
});

export const actions = {
	default: async ({ request }) => {
		const ip = getClientIP(request);

		// Rate limit: 5x per IP per 15 menit
		const rl = await checkRateLimit({
			key: ip,
			prefix: 'rl:forgot-pw:ip',
			limit: 5,
			windowSec: 60 * 15
		});
		if (!rl.allowed) {
			return fail(429, {
				message: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(rl.retryAfter / 60)} menit.`
			});
		}

		const data = await request.formData();
		const parsed = emailSchema.safeParse({ email: data.get('email') });

		if (!parsed.success) {
			return fail(400, { message: parsed.error.errors[0]?.message });
		}

		const { email } = parsed.data;

		// Pesan sukses SAMA terlepas email ada atau tidak (anti enumeration)
		const successMessage =
			'Jika email ini terdaftar, kamu akan menerima link reset password dalam beberapa menit.';

		try {
			const rows = await db
				.select({ id: users.id, username: users.username })
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			if (rows.length === 0) {
				// Return success meski user tidak ada
				return { success: true, message: successMessage };
			}

			const user = rows[0];
			const token = await createResetToken(user.id);
			const origin = (env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
			const resetUrl = `${origin}/auth/reset-password?token=${token}`;

			await sendPasswordResetEmail({
				to: email,
				username: user.username,
				resetUrl
			});
		} catch (err) {
			console.error('[ForgotPassword] Error:', err);
			// Jangan expose detail error ke user
		}

		return { success: true, message: successMessage };
	}
};
