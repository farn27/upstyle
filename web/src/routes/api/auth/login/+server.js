import { db } from '$lib/server/drizzle';
import { users, riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { apiSuccess, apiError, apiRateLimit, apiValidationError } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, API_LOGIN_LIMIT } from '$lib/server/rateLimit';
import { apiLoginSchema } from '$lib/server/validation';
import { createSession } from '$lib/server/session';
import { log } from '$lib/server/logger';

/**
 * Log failed login attempt for audit purposes
 */
async function logFailedLogin(email, ip, reason) {
	try {
		// Gunakan raw insert tanpa FK check untuk security audit log
		await db.execute(
			`INSERT INTO riwayat_aksi (user_id, unit_id, pesan, kategori, tipe) VALUES (0, 0, ?, 'SECURITY', 'error')`,
			[`Gagal login: ${email} - ${reason} (IP: ${ip})`]
		);
	} catch (err) {
		log.auth.warn({ err }, '[Audit Log] Failed to log login attempt');
	}
}

export async function POST({ request }) {
	// Rate limit per IP
	const ip = getClientIP(request);
	const rlIP = await checkRateLimit({
		key: ip,
		prefix: 'rl:api:login:ip',
		...API_LOGIN_LIMIT
	});
	if (!rlIP.allowed) {
		await logFailedLogin('unknown', ip, 'Rate limit exceeded');
		return apiRateLimit(rlIP.retryAfter);
	}

	// Parse & validasi body
	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Request body harus berformat JSON', 400, 'INVALID_JSON');
	}

	const parsed = apiLoginSchema.safeParse(body);
	if (!parsed.success) {
		return apiValidationError(parsed.error);
	}

	const { email, password } = parsed.data;

	// Rate limit per email
	const rlEmail = await checkRateLimit({
		key: email,
		prefix: 'rl:api:login:email',
		...API_LOGIN_LIMIT
	});
	if (!rlEmail.allowed) {
		await logFailedLogin(email, ip, 'Email rate limit exceeded');
		return apiRateLimit(rlEmail.retryAfter);
	}

	try {
		const rows = await db
			.select({ id: users.id, username: users.username, email: users.email, password: users.password, role: users.role })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		// Pesan sama untuk tidak-ada & salah password (hindari user enumeration)
		if (rows.length === 0) {
			await logFailedLogin(email, ip, 'User not found');
			return apiError('Email atau password salah', 401, 'INVALID_CREDENTIALS');
		}

		const user = rows[0];

		if (!user.password) {
			await logFailedLogin(email, ip, 'OAuth account');
			return apiError(
				'Akun ini terdaftar via Google. Gunakan login Google.',
				401,
				'OAUTH_ACCOUNT'
			);
		}

		const match = await argon2.verify(user.password, password);
		if (!match) {
			await logFailedLogin(email, ip, 'Invalid password');
			return apiError('Email atau password salah', 401, 'INVALID_CREDENTIALS');
		}

		// Buat session di Redis
		const sessionToken = await createSession(user.id);

		return apiSuccess(
			{
				token: sessionToken,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					role: user.role
				}
			},
			'Login berhasil'
		);
	} catch (err) {
		log.auth.error({ err }, '[API Login] Error');
		return apiError('Terjadi kesalahan server', 500, 'SERVER_ERROR');
	}
}
