import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import argon2 from 'argon2';
import { checkRateLimit, getClientIP, REGISTER_LIMIT } from '$lib/server/rateLimit';
import { registerSchema, formDataToObject } from '$lib/server/validation';
import { createVerifyToken } from '$lib/server/emailToken';
import { sendVerifyEmail } from '$lib/server/email';
import { log } from '$lib/server/logger';
import { env } from '$env/dynamic/private';

export const actions = {
	default: async ({ request }) => {
		const ip = getClientIP(request);

		// Rate limit registrasi: 5x per IP per jam
		const rl = await checkRateLimit({
			key: ip,
			prefix: 'rl:register:ip',
			...REGISTER_LIMIT
		});
		if (!rl.allowed) {
			return fail(429, {
				message: `Terlalu banyak pendaftaran. Coba lagi dalam ${Math.ceil(rl.retryAfter / 60)} menit.`
			});
		}

		const data = await request.formData();
		const raw = formDataToObject(data);

		// Validasi input dengan Zod
		const parsed = registerSchema.safeParse(raw);
		if (!parsed.success) {
			const firstError = parsed.error.errors[0]?.message || 'Input tidak valid';
			return fail(400, {
				message: firstError,
				username: raw.username,
				email: raw.email
			});
		}

		const { username, email, password } = parsed.data;

		try {
			// Cek email sudah terdaftar
			const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
			if (existing.length > 0) {
				return fail(400, {
					message: 'Email sudah terdaftar. Silakan login.',
					username,
					email
				});
			}

			// Cek username sudah dipakai
			const existingUsername = await db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.username, username))
				.limit(1);
			if (existingUsername.length > 0) {
				return fail(400, {
					message: 'Username sudah dipakai. Pilih username lain.',
					email
				});
			}

			// Hash password dengan Argon2
			const hashedPassword = await argon2.hash(password);

			await db.insert(users).values({
				username,
				email,
				password: hashedPassword,
				role: 'free'
			});

			// Kirim email verifikasi (non-blocking jika Resend belum dikonfigurasi)
			try {
				const newUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
				if (newUser.length > 0) {
					const userId = newUser[0].id;
					const token = await createVerifyToken(userId);
					const origin = (env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
					const verifyUrl = `${origin}/auth/verify-email?token=${token}`;
					await sendVerifyEmail({ to: email, username, verifyUrl });
				}
			} catch (emailErr) {
				// Jangan gagalkan register jika email error
				log.auth.warn({ err: emailErr.message }, '[Register] Gagal kirim email verifikasi');
			}
		} catch (err) {
			log.auth.error({ err }, '[Register] Error');
			return fail(500, {
				message: 'Terjadi kesalahan pada server. Coba lagi nanti.'
			});
		}

		throw redirect(303, '/auth/login?registered=1');
	}
};