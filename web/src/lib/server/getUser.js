import { getUserIdFromSession } from '$lib/server/session';

/**
 * Helper cepat untuk ambil userId dari cookie session di semua server file
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @returns {Promise<number|null>}
 */
export async function getCurrentUserId(cookies, request) {
	let token = cookies.get('session_id');
	if (!token && request) {
		const authHeader = request.headers.get('authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.substring(7);
		}
	}
	if (!token) return null;
	return await getUserIdFromSession(token);
}