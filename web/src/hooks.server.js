import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getUserIdFromSession } from '$lib/server/session';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { redis } from '$lib/server/redis';
import { guardUnitApiApp } from '$lib/server/apiUnitGuard';
import { bacaKunciIdempoten, mulaiIdempoten, selesaiIdempoten } from '$lib/server/idempotency';
import { log } from '$lib/server/logger';
import { peranDiizinkan } from '$lib/server/rbac';
import { slugUnitDariPath, pemilikUnitDariSlug, putuskanAksesUnit } from '$lib/server/unitSlugGuard';
import { tandaiBerubah } from '$lib/server/cacheVersi';
import { konteksPermintaan, catatLog } from '$lib/server/telemetri';

const PROTECTED_PATHS = [
	'/finance',
	'/sales',
	'/marketing',
	'/customer-service',
	'/ecommerce',
	'/notification',
	'/settings',
	'/help'
];
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/logout'];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'];

// ─── Security Headers ─────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	// CSP minimal yang tidak mengganggu script/style yang ada: larang plugin (<object>),
	// cegah <base> disuntik, dan larang halaman di-iframe situs lain (clickjacking).
	'Content-Security-Policy': "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
};

function getAllowedOrigins() {
	/** @type {string[]} */
	const origins = [];
	if (env.ORIGIN) origins.push(env.ORIGIN.trim());
	if (env.ALLOWED_ORIGINS) {
		origins.push(
			...env.ALLOWED_ORIGINS.split(',')
				.map((o) => o.trim())
				.filter(Boolean)
		);
	}
	return [...new Set(origins)];
}

/** @param {string | null} requestOrigin */
function resolveCorsOrigin(requestOrigin) {
	if (!requestOrigin) return null;

	const allowed = getAllowedOrigins();
	if (allowed.includes(requestOrigin)) return requestOrigin;

	if (env.NODE_ENV !== 'production') {
		if (
			requestOrigin.startsWith('http://localhost:') ||
			requestOrigin.startsWith('http://127.0.0.1:')
		) {
			return requestOrigin;
		}
	}

	return null;
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let sessionToken = event.cookies.get('session_id');
	if (!sessionToken) {
		const authHeader = event.request.headers.get('authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			sessionToken = authHeader.substring(7);
		}
	}
	const pathname = event.url.pathname;
	const origin = event.request.headers.get('origin');
	const corsOrigin = resolveCorsOrigin(origin);

	// Handle CORS preflight
	if (event.request.method === 'OPTIONS') {
		/** @type {Record<string, string>} */
		const headers = {
			'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
			'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
			'Access-Control-Max-Age': '86400',
			...SECURITY_HEADERS
		};
		if (corsOrigin) {
			headers['Access-Control-Allow-Origin'] = corsOrigin;
		}
		return new Response(null, { status: 204, headers });
	}

	const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
	const isAuthPage =
		AUTH_PATHS.some((p) => pathname.startsWith(p)) && pathname !== '/auth/logout';

	// Cek staff portal access untuk route POS
	const isPosPortalRoute = /^\/finance\/[^\/]+\/pos(?:\/.*)?$/.test(pathname);
	let staffSession = null;
	if (isPosPortalRoute) {
		const unitSlug = pathname.split('/')[2] || null;
		if (unitSlug) {
			staffSession = await getVerifiedStaffSession(event.cookies, { unitSlug });
		}
	}
	const isStaffPosAllowed = Boolean(staffSession);

	// Load owner user dari session token — CACHED di Redis (TTL 5 menit)
	if (sessionToken) {
		try {
			const userId = await getUserIdFromSession(sessionToken);

			if (userId) {
				// Cek Redis dulu — hindari DB query setiap request
				const userCacheKey = `hooks_user:${userId}`;
				// Redis opsional: bila tidak tersedia/galat, langsung ke DB (dulu melempar → user tidak termuat)
				let userFound = redis ? await redis.get(userCacheKey).catch(() => null) : null;

				if (!userFound) {
					const [row] = await db
						.select({ id: users.id, username: users.username, role: users.role })
						.from(users)
						.where(eq(users.id, userId))
						.limit(1);
					userFound = row || null;
					if (userFound && redis) await redis.set(userCacheKey, userFound, { ex: 300 }).catch(() => {}); // 5 menit
				}

				if (userFound) {
					event.locals.user = {
						id: userFound.id,
						username: userFound.username,
						role: userFound.role
					};
				}
			}
		} catch (err) {
			log.auth.error({ err }, '[Hooks] Gagal load user');
		}
	}

	// CSRF: ditangani bawaan SvelteKit (cek Origin pada form POST) — lihat svelte.config.js

	// RBAC Check for authenticated users
	if (isProtected && event.locals.user) {
		const userRole = event.locals.user.role?.toUpperCase() || 'STAFF';
		const isAllowed = peranDiizinkan(userRole, pathname);

		if (!isAllowed) {
			if (pathname.startsWith('/api') || event.request.method !== 'GET') {
				return new Response(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges', code: 'FORBIDDEN' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
				});
			}
			let redirectPath = '/finance';
			
			if (userRole === 'CASHIER' || userRole === 'STAFF') {
				redirectPath = '/portal';
			} else {
				const unitSlug = pathname.split('/')[2];
				if (unitSlug) redirectPath = `/finance/${unitSlug}/pos`;
			}

			if (pathname !== redirectPath) {
				throw redirect(303, redirectPath);
			} else {
				log.auth.error({ pathname, userRole, redirectPath, isAllowed }, '[RBAC] Blocked access');
				return new Response('Forbidden: Insufficient Privileges', { status: 403 });
			}
		}
	}

	// Guard: halaman ber-slug unit (/finance/<slug>/…, /ecommerce/<slug>/…) hanya untuk pemilik unit itu,
	// atau staf portal unit tersebut (khusus halaman kasir). Lihat lib/server/unitSlugGuard.js.
	const segUnit = slugUnitDariPath(pathname);
	if (segUnit && (event.locals.user || staffSession)) {
		let pemilikUnitId = null;
		if (event.locals.user) {
			const kunci = `unit_pemilik:${segUnit.slug}`;
			let pemilik = null;
			try {
				pemilik = redis ? await redis.get(kunci) : null;
			} catch {
				pemilik = null;
			}
			if (!pemilik || typeof pemilik !== 'object') {
				pemilik = await pemilikUnitDariSlug(db, segUnit.slug);
				if (pemilik && redis) await redis.set(kunci, pemilik, { ex: 120 }).catch(() => {});
			}
			pemilikUnitId = pemilik?.userId ?? null;
		}
		const keputusan = putuskanAksesUnit({
			pathname,
			userId: event.locals.user?.id ?? null,
			pemilikUnitId,
			sesiStaf: staffSession
		});
		if (keputusan === 'bukan_milik') {
			log.auth.warn({ pathname, userId: event.locals.user?.id }, '[Guard] Akses unit bukan milik user ditolak');
			if (event.request.method !== 'GET') {
				return new Response(
					JSON.stringify({ success: false, message: 'Unit bisnis tidak ditemukan', code: 'UNIT_NOT_FOUND' }),
					{ status: 404, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
				);
			}
			throw error(404, 'Unit bisnis tidak ditemukan');
		}
		if (keputusan === 'staf_dibatasi') {
			if (event.request.method !== 'GET') {
				return new Response(
					JSON.stringify({ success: false, message: 'Hanya pemilik atau manajer yang boleh mengakses halaman ini', code: 'FORBIDDEN' }),
					{ status: 403, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
				);
			}
			throw redirect(303, `/finance/${segUnit.slug}/pos`);
		}
	}

	// Guard: protected route tanpa session
	if (isProtected && !event.locals.user && !isStaffPosAllowed) {
		if (pathname.startsWith('/api')) {
			return new Response(
				JSON.stringify({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }),
				{
					status: 401,
					headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
				}
			);
		}
		throw redirect(303, '/auth/login');
	}

	// Guard: halaman auth saat sudah login
	if (isAuthPage && event.locals.user) {
		if (pathname.startsWith('/api')) {
			return new Response(
				JSON.stringify({
					success: false,
					message: 'Already authenticated',
					code: 'ALREADY_AUTHENTICATED'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
				}
			);
		}
		const role = event.locals.user.role?.toUpperCase() || 'STAFF';
		if (role === 'CASHIER' || role === 'STAFF') {
			throw redirect(303, '/portal');
		}
		throw redirect(303, '/finance');
	}

	// Guard: API mobile hanya boleh menyentuh unit milik user yang login
	if (event.locals.user && pathname.startsWith('/api/app/')) {
		const ditolak = await guardUnitApiApp(db, event, event.locals.user.id);
		if (ditolak) {
			Object.entries(SECURITY_HEADERS).forEach(([key, value]) => ditolak.headers.set(key, value));
			if (corsOrigin) ditolak.headers.set('Access-Control-Allow-Origin', corsOrigin);
			return ditolak;
		}
	}

	// Idempotency: request dari antrean offline app tidak boleh tercatat dua kali
	const idemKey = event.locals.user && pathname.startsWith('/api/app/') && event.request.method !== 'GET'
		? bacaKunciIdempoten(event.request)
		: null;
	if (idemKey && event.locals.user) {
		const tersimpan = await mulaiIdempoten(redis, event.locals.user.id, idemKey);
		if (tersimpan) {
			Object.entries(SECURITY_HEADERS).forEach(([key, value]) => tersimpan.headers.set(key, value));
			if (corsOrigin) tersimpan.headers.set('Access-Control-Allow-Origin', corsOrigin);
			return tersimpan;
		}
	}

	// Konteks permintaan untuk telemetri Ruang Kendali (siapa & rute mana yang memakai AI / memicu galat)
	const response = await konteksPermintaan.run(
		{ userId: event.locals.user?.id ?? staffSession?.owner_id ?? null, jalur: pathname, rute: event.route?.id ?? null },
		() => resolve(event)
	);
	if (response.status >= 500) {
		catatLog({ sumber: 'http', pesan: `${event.request.method} ${event.route?.id || pathname}`, status: response.status, userId: event.locals.user?.id ?? null });
	}

	if (idemKey && event.locals.user) await selesaiIdempoten(redis, event.locals.user.id, idemKey, response);

	// Permintaan yang mengubah data → naikkan versi cache pemilik/unit supaya dasbor, riwayat, dan daftar
	// produk tidak menyajikan data basi (lihat lib/server/cacheVersi.js)
	if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) && response.status < 400 && (event.locals.user || staffSession || segUnit)) {
		await tandaiBerubah({ userId: event.locals.user?.id ?? staffSession?.owner_id ?? null, slug: segUnit?.slug ?? null });
	}

	// Terapkan security headers ke semua response
	Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	if (corsOrigin) {
		response.headers.set('Access-Control-Allow-Origin', corsOrigin);
	}
	response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
	response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));

	return response;
}

/**
 * Galat tak terduga: catat ke log_sistem (Ruang Kendali) tanpa membocorkan detail ke pengguna.
 * @type {import('@sveltejs/kit').HandleServerError}
 */
export async function handleError({ error: galat, event, status, message }) {
	if (status !== 404) {
		const e = /** @type {any} */ (galat);
		log.api.error({ err: galat, rute: event.route?.id }, '[Hooks] Galat tak terduga');
		await catatLog({
			sumber: 'exception',
			pesan: `${event.route?.id || event.url.pathname}: ${String(e?.message || galat).slice(0, 300)}`,
			status,
			meta: { metode: event.request.method, stack: String(e?.stack || '').split('\n').slice(0, 6).join('\n') },
			userId: event.locals.user?.id ?? null
		});
	}
	return { message };
}
