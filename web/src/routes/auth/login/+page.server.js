import { redirect, fail } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq, or } from 'drizzle-orm';
import argon2 from 'argon2';
import { secureCookieOptions } from '$lib/server/cookieOptions';
import { checkRateLimit, getClientIP, LOGIN_LIMIT } from '$lib/server/rateLimit';
import { loginSchema, formDataToObject } from '$lib/server/validation';
import { log } from '$lib/server/logger';

export const actions = {
	// 1. LOGIN MANUAL (Username/Email + Password)
	login: async ({ request, cookies }) => {
		const ip = getClientIP(request);

		// Rate limit: per IP
		const rlIP = await checkRateLimit({
			key: ip,
			prefix: 'rl:login:ip',
			...LOGIN_LIMIT
		});
		if (!rlIP.allowed) {
			return fail(429, {
				error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(rlIP.retryAfter / 60)} menit.`
			});
		}

		const data = await request.formData();
		const raw = formDataToObject(data);

		// Validasi input dengan Zod
		const parsed = loginSchema.safeParse(raw);
		if (!parsed.success) {
			const firstError = parsed.error.errors[0]?.message || 'Input tidak valid';
			return fail(400, { error: firstError });
		}

		const { username, password } = parsed.data;

		// Rate limit: per identitas (username/email)
		const rlIdentity = await checkRateLimit({
			key: username.toLowerCase(),
			prefix: 'rl:login:identity',
			...LOGIN_LIMIT
		});
		if (!rlIdentity.allowed) {
			return fail(429, {
				error: `Akun ini sementara dikunci karena terlalu banyak percobaan. Coba lagi nanti.`
			});
		}

		try {
			const rows = await db
				.select({
					id: users.id,
					username: users.username,
					email: users.email,
					password: users.password,
					role: users.role
				})
				.from(users)
				.where(or(eq(users.username, username), eq(users.email, username)))
				.limit(1);

			// Pesan error sama untuk user-not-found & wrong-password (hindari user enumeration)
			if (rows.length === 0) {
				return fail(400, { error: 'Username/email atau password salah' });
			}

			const user = rows[0];

			if (!user.password) {
				// Akun OAuth tanpa password
				return fail(400, { error: 'Akun ini terdaftar via Google. Silakan login dengan Google.' });
			}

			const match = await argon2.verify(user.password, password);
			if (!match) {
				return fail(400, { error: 'Username/email atau password salah' });
			}

			// Generate session token, simpan di Redis
			const { createSession } = await import('$lib/server/session');
			const sessionToken = await createSession(user.id);
			cookies.set('session_id', sessionToken, {
				...secureCookieOptions(60 * 60 * 24),
				sameSite: 'strict'
			});
		} catch (err) {
			log.auth.error({ err }, '[Login] Error');
			return fail(500, { error: 'Terjadi kesalahan sistem. Coba lagi nanti.' });
		}

		throw redirect(303, '/');
	},

	// 2. LOGIN GOOGLE
	google: async ({ url }) => {
		const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
		const origin = (url.origin && !url.origin.includes('localhost') ? url.origin : (env.ORIGIN || url.origin)).replace(/\/$/, '');
		const options = {
			redirect_uri: `${origin}/auth/callback/google`,
			client_id: GOOGLE_CLIENT_ID,
			access_type: 'offline',
			response_type: 'code',
			prompt: 'consent',
			scope: [
				'https://www.googleapis.com/auth/userinfo.profile',
				'https://www.googleapis.com/auth/userinfo.email'
			].join(' ')
		};

		throw redirect(302, `${rootUrl}?${new URLSearchParams(options).toString()}`);
	},

	// 3. LOGOUT
	logout: async ({ cookies }) => {
		const token = cookies.get('session_id');
		if (token) {
			const { deleteSession } = await import('$lib/server/session');
			await deleteSession(token).catch(() => {});
		}
		cookies.delete('session_id', { path: '/' });
		throw redirect(303, '/auth/login');
	}
};