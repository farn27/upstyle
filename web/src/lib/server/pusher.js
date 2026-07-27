import Pusher from 'pusher';
import { PUSHER_APP_ID, PUSHER_SECRET } from '$env/static/private';
import { PUBLIC_PUSHER_KEY, PUBLIC_PUSHER_CLUSTER } from '$env/static/public';

// 👇 SAYA GANTI DARI 'pusher' JADI 'pusherServer'

// Make pusher initialization conditional to avoid blocking SSR
export const pusherServer = PUSHER_APP_ID && PUSHER_SECRET && PUBLIC_PUSHER_KEY && PUBLIC_PUSHER_CLUSTER
    ? new Pusher({
        appId: PUSHER_APP_ID,
        key: PUBLIC_PUSHER_KEY,
        secret: PUSHER_SECRET,
        cluster: PUBLIC_PUSHER_CLUSTER,
        useTLS: true
    })
    : null;

// Fungsi pembantu (Opsional, tapi saya sesuaikan juga variabelnya)
export const triggerEvent = async (channel, event, data) => {
    try {
        if (!pusherServer) {
            console.warn('⚠️ Pusher not configured, skipping event trigger');
            return;
        }
        // 👇 Ini juga harus pakai pusherServer
        await pusherServer.trigger(channel, event, data);
        console.log(`📡 Signal sent: ${channel} -> ${event}`);
    } catch (error) {
        console.error('❌ Pusher Error:', error);
    }
};