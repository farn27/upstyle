import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { apiSuccess, apiError, apiRateLimit, apiValidationError } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, REGISTER_LIMIT } from '$lib/server/rateLimit';
import { apiRegisterSchema } from '$lib/server/validation';

export async function POST({ request }) {
	// Rate limit: 5x per IP per jam
	const ip = getClientIP(request);
	const rl = await checkRateLimit({
		key: ip,
		prefix: 'rl:api:register:ip',
		...REGISTER_LIMIT
	});
	if (!rl.allowed) {
		return apiRateLimit(rl.retryAfter);
	}

	// Parse & validasi body
	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Request body harus berformat JSON', 400, 'INVALID_JSON');
	}

	const parsed = apiRegisterSchema.safeParse(body);
	if (!parsed.success) {
		return apiValidationError(parsed.error);
	}

	const { username, email, password } = parsed.data;

	try {
		// Cek email duplikat
		const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
		if (existing.length > 0) {
			return apiError('Email sudah terdaftar', 400, 'EMAIL_TAKEN');
		}

		// Cek username duplikat
		const existingUser = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, username))
			.limit(1);
		if (existingUser.length > 0) {
			return apiError('Username sudah dipakai', 400, 'USERNAME_TAKEN');
		}

		const hashedPassword = await argon2.hash(password);

		await db.insert(users).values({
			username,
			email,
			password: hashedPassword,
			role: 'free'
		});

		return apiSuccess(null, 'Registrasi berhasil! Silakan login.', 201);
	} catch (err) {
		console.error('[API Register] Error:', err);
		return apiError('Terjadi kesalahan server', 500, 'SERVER_ERROR');
	}
}
