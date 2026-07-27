import Pusher from 'pusher-js';
import { PUBLIC_PUSHER_KEY, PUBLIC_PUSHER_CLUSTER } from '$env/static/public';

let pusherInstance;

// Ini fungsi yang dicari oleh halaman +page.svelte kamu
export const getPusherClient = () => {
    if (!pusherInstance) {
        pusherInstance = new Pusher(PUBLIC_PUSHER_KEY, {
            cluster: PUBLIC_PUSHER_CLUSTER,
            authEndpoint: '/pusher/auth',
        });
    }
    return pusherInstance;
};