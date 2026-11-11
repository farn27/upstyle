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
/**
 * Catat percobaan login gagal ke log server (audit keamanan).
 * Dulu memakai db.execute(string, params) — bentuk yang tidak didukung Drizzle — dan menulis ke riwayat_aksi
 * dengan user_id 0 yang melanggar foreign key, sehingga tidak pernah ada yang tersimpan.
 * Email disamarkan supaya log tidak menyimpan alamat lengkap.
 * @param {string} email @param {string} ip @param {string} reason
 */
async function logFailedLogin(email, ip, reason) {
	const [nama, domain] = String(email || '').split('@');
	const samaran = domain ? `${nama.slice(0, 2)}***@${domain}` : String(email || '').slice(0, 2) + '***';
	log.auth.warn({ email: samaran, ip, reason, audit: 'LOGIN_GAGAL' }, '[Audit] Login gagal');
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
