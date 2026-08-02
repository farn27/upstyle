/**
 * GET /api/auth/check-email?email=xxx
 * Validasi email:
 * 1. Format valid (Zod)
 * 2. Domain bukan disposable/fake (blocklist)
 * 3. Belum terdaftar di DB
 *
 * Sengaja TIDAK pakai dns.resolveMx() karena menyebabkan timeout di Vite dev server.
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, getClientIP } from '$lib/server/rateLimit';
import { z } from 'zod';

const emailSchema = z.string().email();

// Domain yang dikenal sebagai disposable/fake email
const BLOCKED_DOMAINS = new Set([
	'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
	'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
	'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
	'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
	'trashmail.me', 'trashmail.net', 'dispostable.com', 'maildrop.cc',
	'fakeinbox.com', 'getairmail.com', 'discard.email', 'spamgourmet.com',
	'trashmail.at', 'tempr.email', 'tempinbox.com', '10minutemail.com',
	'10minutemail.net', 'minutemailbox.com', 'mailnesia.com', 'mailnull.com',
]);

// Domain email yang dikenal valid (whitelist populer)
const KNOWN_VALID_DOMAINS = new Set([
	'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
	'protonmail.com', 'mail.com', 'live.com', 'msn.com', 'ymail.com',
	'googlemail.com', 'me.com', 'mac.com', 'rocketmail.com',
]);

export async function GET({ url, request }) {
	const email = url.searchParams.get('email')?.trim().toLowerCase();

	if (!email) {
		return json({ valid: false, message: 'Email wajib diisi' });
	}

	// Format check
	const parsed = emailSchema.safeParse(email);
	if (!parsed.success) {
		return json({ valid: false, message: 'Format email tidak valid' });
	}

	// Rate limit — 30x per menit per IP
	const ip = getClientIP(request);
	const rl = await checkRateLimit({
		key: ip,
		prefix: 'rl:check-email',
		limit: 30,
		windowSec: 60
	});
	if (!rl.allowed) {
		return json({ valid: false, message: 'Terlalu banyak request, coba lagi sebentar' });
	}

	const domain = email.split('@')[1];

	// Cek domain disposable
	if (BLOCKED_DOMAINS.has(domain)) {
		return json({ valid: false, message: `Domain @${domain} tidak diizinkan (email sementara)` });
	}

	// Cek domain — harus punya TLD yang wajar (minimal x.xx)
	const domainParts = domain.split('.');
	if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
		return json({ valid: false, message: `Domain @${domain} tidak valid` });
	}

	// Cek duplikat di DB
	try {
		const existing = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (existing.length > 0) {
			return json({ valid: false, taken: true, message: 'Email sudah terdaftar, silakan login' });
		}
	} catch {
		// DB error jangan blokir user
		return json({ valid: true, message: '' });
	}

	return json({ valid: true, message: '' });
}
