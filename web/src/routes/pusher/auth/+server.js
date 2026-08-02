import { json } from '@sveltejs/kit';
import { pusherServer } from '$lib/server/pusher';
import { log } from '$lib/server/logger.js';

export const config = { csrf: false };

export const POST = async ({ request, locals }) => {
    const user = locals.user;

    log.auth.debug({ username: user?.username, role: user?.role }, 'Pusher auth request');

    if (!user) {
        log.auth.warn('Pusher auth rejected: no session');
        return json({ message: 'Forbidden' }, { status: 403 });
    }

    const data = await request.formData();
    const socketId = data.get('socket_id');
    const channel = data.get('channel_name');

    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
        user_id: user.id,
        user_info: { name: user.username, role: user.role }
    });

    return json(authResponse);
};
