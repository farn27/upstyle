/**
 * Socket.io Server Event Trigger
 * Replaces Pusher triggerEvent for server-side event broadcasting
 * 
 * This sends events to the Socket.io server via HTTP API or Redis pub/sub
 */

import { redis } from '$lib/server/redis';
import { env } from '$env/dynamic/private';

const SOCKET_SERVER_URL = env.SOCKET_SERVER_URL || 'http://localhost:3001';

/**
 * Trigger Socket.io event via HTTP API
 * @param {string} room - Room name (e.g., 'unit-123')
 * @param {string} event - Event name (e.g., 'pos-transaction')
 * @param {Object} data - Event payload
 */
export async function triggerSocketEvent(room, event, data) {
    try {
        // Try HTTP API first
        const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.SOCKET_API_KEY || 'internal'}`
            },
            body: JSON.stringify({ room, event, data })
        });

        if (response.ok) {
            console.log(`📡 Socket.io event sent: ${room} -> ${event}`);
            return true;
        } else {
            throw new Error(`HTTP API failed: ${response.status}`);
        }
    } catch (httpError) {
        console.warn('[Socket Trigger] HTTP API failed, trying Redis pub/sub:', httpError.message);
        
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
    ticketMessage: (ticketId, data) => 
        triggerSocketEvent(`ticket-${ticketId}`, 'ticket-message', data),
    
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
 * Legacy function name for backward compatibility
 * Replaces the old triggerEvent from pusher.js
 */
export async function triggerEvent(channel, event, data) {
    // Parse unit ID from channel name for backward compatibility
    // Old format: 'private-unit-123' -> 'unit-123'
    // Old format: 'finance-slug' -> extract unitId from database if needed
    
    let room = channel;
    
    // Convert old Pusher channel names to Socket.io room names
    if (channel.startsWith('private-unit-')) {
        room = channel.replace('private-unit-', 'unit-');
    } else if (channel.startsWith('finance-')) {
        // For finance channels, we need to get unitId from slug
        // This is a simplified version - in production, you'd look up the unitId
        room = channel; // Keep as-is for now, will be handled by the caller
    }
    
    return triggerSocketEvent(room, event, data);
}
