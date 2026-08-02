import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { consumeVerifyToken } from '$lib/server/emailToken';
import { sendWelcomeEmail } from '$lib/server/email';
import { log } from '$lib/server/logger';

export async function GET({ url }) {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(303, '/auth/login?verify=invalid');
	}

	const userId = await consumeVerifyToken(token);

	if (!userId) {
		throw redirect(303, '/auth/login?verify=expired');
	}

	try {
		// Tandai email sudah terverifikasi
		await db.update(users).set({ emailVerifiedAt: sql`NOW()` }).where(eq(users.id, userId));

		// Ambil user info untuk welcome email
		const rows = await db.select({ username: users.username, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
		if (rows.length > 0) {
			// Send welcome email non-blocking
			sendWelcomeEmail({ to: rows[0].email, username: rows[0].username }).catch(() => {});
		}
	} catch (err) {
		log.auth.error({ err }, '[VerifyEmail] Error');
		// Tetap redirect ke success meski welcome email gagal
	}

	throw redirect(303, '/auth/login?verify=success');
}
