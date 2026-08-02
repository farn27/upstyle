import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getUserIdFromSession } from '$lib/server/session';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { redis } from '$lib/server/redis';
import { generateCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { log } from '$lib/server/logger';

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
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With'];

// ─── Security Headers ─────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
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

const rolePermissions = {
	CASHIER: [],
	STAFF: [],
	MANAGER: ['.*'],
	ADMIN: ['.*'],
	OWNER: ['.*'],
	USER: ['.*'],
	FREE: ['.*']
};

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
				let userFound = await redis.get(userCacheKey);

				if (!userFound) {
					const [row] = await db
						.select({ id: users.id, username: users.username, role: users.role })
						.from(users)
						.where(eq(users.id, userId))
						.limit(1);
					userFound = row || null;
					if (userFound) await redis.set(userCacheKey, userFound, { ex: 300 }); // 5 menit
				}

				if (userFound) {
					event.locals.user = {
						id: userFound.id,
						username: userFound.username,
						role: userFound.role
					};
					
					// Generate CSRF token for authenticated users
					const csrfToken = generateCsrfToken(sessionToken);
					event.locals.csrfToken = csrfToken;
				}
			}
		} catch (err) {
			log.auth.error({ err }, '[Hooks] Gagal load user');
		}
	}

	// CSRF validation for POST/PUT/DELETE/PATCH requests (except API endpoints)
	const isMutationRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method);
	const isApiRoute = pathname.startsWith('/api/');
	const isAuthRoute = pathname.startsWith('/auth/');
	
	// Skip CSRF validation for API routes and auth routes
	if (isMutationRequest && !isApiRoute && !isAuthRoute && sessionToken) {
		const csrfTokenFromHeader = event.request.headers.get('x-csrf-token');
		
		// Only validate if we have a CSRF token from header (to avoid consuming body)
		// Body-based CSRF validation is handled by the action itself if needed
		if (csrfTokenFromHeader && !validateCsrfToken(csrfTokenFromHeader, sessionToken)) {
			log.auth.warn({ pathname }, '[CSRF] Invalid token for request');
			return new Response(JSON.stringify({ success: false, message: 'CSRF validation failed', code: 'CSRF_INVALID' }), { 
				status: 403, 
				headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } 
			});
		}
	}

	// RBAC Check for authenticated users
	if (isProtected && event.locals.user) {
		const userRole = event.locals.user.role?.toUpperCase() || 'STAFF';
		const allowedPatterns = rolePermissions[userRole] || rolePermissions['STAFF'];
		const isAllowed = allowedPatterns.some(pattern => new RegExp(pattern).test(pathname));

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

	const response = await resolve(event);

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
