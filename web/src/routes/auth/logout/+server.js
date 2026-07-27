import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/session';
import { redis } from '$lib/server/redis';

export async function POST({ cookies }) {
    const sessionToken = cookies.get('session_id');
    if (sessionToken) {
        await deleteSession(sessionToken);
        await redis.del(`layout_session:${sessionToken}`).catch(() => {});
    }

    cookies.delete('session_id', { path: '/' });
    throw redirect(303, '/auth/login');
}
