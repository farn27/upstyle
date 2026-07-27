/** @type {import('./$types').RequestHandler} */
import { deleteStaffSession } from '$lib/server/staffSession';

export async function POST({ cookies, params }) {
	const token = cookies.get('staff_session_token');
	if (token) {
		await deleteStaffSession(token).catch(() => {});
	}

	cookies.delete('staff_session_token', { path: '/' });
	cookies.delete('staff_session', { path: '/' });

	return new Response(null, {
		status: 303,
		headers: {
			Location: `/portal/${params.login_slug}`
		}
	});
}
