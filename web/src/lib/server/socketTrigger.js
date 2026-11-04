/**
 * Socket.io Server Event Trigger
 * Replaces Pusher triggerEvent for server-side event broadcasting
 * 
 * This sends events to the Socket.io server via HTTP API or Redis pub/sub
 */

import { redis } from '$lib/server/redis';
import { env } from '$env/dynamic/private';

// Wajib diisi lewat environment (Vercel / .env). JANGAN taruh nilai asli di kode.
const SOCKET_SERVER_URL = env.SOCKET_SERVER_URL;
const SOCKET_API_KEY = env.SOCKET_API_KEY;

if (!SOCKET_SERVER_URL || !SOCKET_API_KEY) {
    console.warn('⚠️ [Socket Trigger] SOCKET_SERVER_URL / SOCKET_API_KEY belum diset. HTTP emit dilewati, pakai Redis pub/sub.');
}

/**
 * Trigger Socket.io event via HTTP API
 * @param {string} room - Room name (e.g., 'unit-123')
 * @param {string} event - Event name (e.g., 'pos-transaction')
 * @param {Object} data - Event payload
 */
export async function triggerSocketEvent(room, event, data) {
    try {
        if (!SOCKET_SERVER_URL || !SOCKET_API_KEY) {
            const configError = new Error('Socket env not configured');
            configError.name = 'ConfigError';
            throw configError;
        }

        // Try HTTP API with 3-second timeout for serverless-to-VPS communication
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SOCKET_API_KEY}`
            },
            body: JSON.stringify({ room, event, data }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            console.log(`📡 Socket.io event sent: ${room} -> ${event}`);
            return true;
        } else {
            throw new Error(`HTTP API failed: ${response.status}`);
        }
    } catch (httpError) {
        // Don't log AbortError as a warning — it's expected fallback
        if (httpError.name !== 'AbortError' && httpError.name !== 'ConfigError') {
            console.warn('[Socket Trigger] HTTP API failed, trying Redis pub/sub:', httpError.message);
        }
        
        // Fallback to Redis pub/sub
        try {
            if (!redis) {
                throw new Error('Redis not available');
            }

            const message = JSON.stringify({
                room,
                event,
                payload: data,
                timestamp: new Date().toISOString()
            });

            await redis.publish('socket.io#/#', message);
            console.log(`📡 Socket.io event sent via Redis: ${room} -> ${event}`);
            return true;
        } catch (redisError) {
            console.error('[Socket Trigger] Redis pub/sub failed:', redisError);
            return false;
        }
    }
}

/**
 * Critical event triggers (Socket.io)
 */
export const socketTriggers = {
    // POS Transactions
    posTransaction: (unitId, data) => 
        triggerSocketEvent(`unit-${unitId}`, 'pos-transaction', data),
    
    // Stock Updates
    stockUpdated: (unitId, data) => 
        triggerSocketEvent(`unit-${unitId}`, 'stock-updated', data),
    
    // Stock Alerts
    stockAlert: (unitId, data) => 
        triggerSocketEvent(`unit-${unitId}`, 'stock-alert', data),
    
    // CS Ticket Messages
    // Room tiket di-scope per unit (harus sama dengan socket-server)
    ticketMessage: (unitId, ticketId, data) => 
        triggerSocketEvent(`unit-${unitId}:ticket-${ticketId}`, 'ticket-message', data),
    
    // POS Cash Alerts
    posCashAlert: (unitId, data) => 
        triggerSocketEvent(`unit-${unitId}`, 'pos-cash-alert', data),
    
    // Notifications
    notification: (unitId, data) => 
        triggerSocketEvent(`unit-${unitId}`, 'notification', data),
    
    // Order Status Changes
    orderStatusChanged: (unitId, data) => 
        triggerSocketEvent(`unit-${unitId}`, 'order-status-changed', data)
};

/**
 * Nama event lama (era Pusher) → nama yang didengar web (realtimeStore) & mobile
 */
const EVENT_ALIASES = {
    'pos-transaction-new': 'pos-transaction',
    'pos-stock-updated': 'stock-updated',
    'product-added': 'stock-updated',
    'notif-baru': 'notification'
};

/**
 * Legacy API (dipakai lewat pusherServer.trigger / triggerEvent).
 * Hanya mengirim ke room unit (`unit-{id}` atau `unit-{id}:ticket-{id}`).
 * Room lain (mis. `finance-{slug}`) DITOLAK: slug tidak unik antar owner,
 * jadi tidak bisa dipetakan ke unit dengan aman.
 */
export async function triggerEvent(channel, event, data) {
    const room = channel.startsWith('private-unit-')
        ? channel.replace('private-unit-', 'unit-')
        : channel;

    if (!/^unit-\d+(:ticket-\d+)?$/.test(room)) {
        console.warn(`[Socket Trigger] Room "${channel}" ditolak — pakai \`unit-\${unitId}\``);
        return false;
    }

    return triggerSocketEvent(room, EVENT_ALIASES[event] || event, data);
}
