import { env } from '$env/dynamic/private';

function isSecureContext() {
	const origin = env.ORIGIN || '';
	if (origin.startsWith('https://')) return true;
	if (env.NODE_ENV === 'production') return true;
	return false;
}

/** @param {number} maxAge */
export function secureCookieOptions(maxAge) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isSecureContext(),
		maxAge
	};
}
