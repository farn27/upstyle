/**
 * realtimeStore.js — Global Realtime Manager
 * Mengelola semua realtime subscription secara terpusat.
 * 
 * HYBRID APPROACH:
 * - CRITICAL events: Socket.io (POS, stock alerts, CS tickets, cash alerts)
 * - NON-CRITICAL events: Polling (finance stats, marketing, reports)
 * 
 * FILOSOFI: Tidak pakai invalidateAll() yang trigger full reload.
 * Sebagai gantinya: update store secara langsung (optimistic),
 * invalidate hanya untuk route yang relevan saja.
 */

import { writable, derived } from 'svelte/store';
import { getSocketClient, onSocketEvent, offSocketEvent, disconnectSocket, joinTicketRoom, leaveTicketRoom } from '$lib/socket';
import { PollingManager } from '$lib/polling';
import { invalidate } from '$app/navigation';
import { addNotif } from '$lib/notifStore';

// ─── Global stores yang bisa di-subscribe dari mana saja ──────────────────────
export const isRealtimeConnected = writable(false);
export const activeChannels = writable([]);
export const realtimeEvents = writable([]); // log event terbaru

// Per-module stores — update tanpa reload halaman
export const salesPipelineUpdate = writable(null);
export const salesOrderUpdate = writable(null);
export const csTicketUpdate = writable(null);
export const ecommerceOrderUpdate = writable(null);
export const marketingLeadUpdate = writable(null);
export const notifUpdate = writable(null);
export const stockUpdate = writable(null);
export const financeUpdate = writable(null);

// ─── State internal ───────────────────────────────────────────────────────────
let socketClient = null;
let currentUnitId = null;
let currentSlug = null;
let currentUsername = null;
let currentUserId = null;
let eventHandlers = new Map(); // eventName → handler function
let pollingManager = null;
let lastUpdate = Date.now();
let usePolling = false;

/**
 * Helper: emit event ke store dan log
 */
function emit(storeName, store, data) {
    store.set({ ...data, _ts: Date.now() });
    realtimeEvents.update(ev => [{ storeName, data, ts: Date.now() }, ...ev].slice(0, 50));
}

/**
 * Polling callback function
 * Checks for updates via API for non-critical events
 */
async function pollingCallback() {
    try {
        const response = await fetch(`/api/updates?slug=${currentSlug}&lastUpdate=${lastUpdate}&type=all`);
        const updates = await response.json();

        if (updates.transactions && updates.transactions.length > 0) {
            updates.transactions.forEach(trx => {
                emit('financeUpdate', financeUpdate, {
                    action: 'stats-updated',
                    newTransaction: trx
                });
            });
        }

        if (updates.products && updates.products.length > 0) {
            updates.products.forEach(prod => {
                emit('stockUpdate', stockUpdate, {
                    action: 'stock-updated',
                    product: prod
                });
            });
        }

        if (updates.sales && updates.sales.length > 0) {
            updates.sales.forEach(sale => {
                emit('salesPipelineUpdate', salesPipelineUpdate, sale);
            });
        }

        if (updates.marketing && updates.marketing.length > 0) {
            updates.marketing.forEach(marketing => {
                emit('marketingLeadUpdate', marketingLeadUpdate, marketing);
            });
        }

        lastUpdate = updates.timestamp || Date.now();
    } catch (error) {
        console.error('[Polling] Error:', error);
    }
}

/**
 * Init semua realtime subscription.
 * Dipanggil dari +layout.svelte saat unitId atau slug berubah.
 */
export async function initGlobalRealtime(unitId, slug, username, userId, sessionToken) {
    if (typeof window === 'undefined') return;
    if (currentUnitId === unitId && currentSlug === slug) return;

    // Cleanup existing sebelum reinit
    cleanupRealtime();

    currentUnitId = unitId;
    currentSlug = slug;
    currentUsername = username;
    currentUserId = userId;

    const channelNames = [];

    // Try Socket.io for critical events
    try {
        socketClient = await getSocketClient({
            token: sessionToken,
            unitId,
            userId
        });
        usePolling = false;
        console.log('[Realtime] Using Socket.io for critical events');
    } catch (socketError) {
        console.warn('[Realtime] Socket.io not available, using polling for all events:', socketError);
        usePolling = true;
        socketClient = null;
    }

    if (usePolling) {
        // Use polling for all events
        pollingManager = new PollingManager({
            interval: 30000, // 30 seconds untuk non-critical
            callback: pollingCallback,
            lastUpdate: lastUpdate
        });
        pollingManager.start();
        isRealtimeConnected.set(true);
        activeChannels.set(['polling']);
        return;
    }

    // ─── CRITICAL: Socket.io Events ───────────────────────────────────────
    
    // Connection confirmation
    const handleConnected = (data) => {
        isRealtimeConnected.set(true);
        console.log('[Realtime] Socket.io connected:', data);
    };

    // POS Transactions (CRITICAL)
    const handlePOSTransaction = (data) => {
        addNotif(`🛒 Pesanan POS Baru: ${data.orderNumber} (${data.customerName || 'Guest'})`);
        emit('financeUpdate', financeUpdate, { action: 'pos-transaction', ...data });
        invalidate('app:finance').catch(() => {});
        invalidate('app:pos').catch(() => {});
    };

    // Stock Updates (CRITICAL)
    const handleStockUpdated = (data) => {
        addNotif(data.message || '📦 Stok diperbarui');
        emit('stockUpdate', stockUpdate, { ...data, action: 'stock-updated' });
        invalidate('app:pos:products').catch(() => {});
    };

    // Stock Alerts (CRITICAL)
    const handleStockAlert = (data) => {
        addNotif(`⚠️ ${data.message}`);
        emit('stockUpdate', stockUpdate, { ...data, action: 'stock-alert' });
    };

    // CS Ticket Messages (CRITICAL)
    const handleTicketMessage = (data) => {
        emit('csTicketUpdate', csTicketUpdate, { action: 'new-message', ...data });
        // Sound notification could be added here
    };

    // POS Cash Alerts (CRITICAL)
    const handlePOSAlert = (data) => {
        addNotif(`⚠️ Selisih Kas POS: Kasir ${data.cashier} memiliki selisih Rp ${data.selisih?.toLocaleString('id-ID') || 0} pada Shift #${data.shiftId}`);
        emit('financeUpdate', financeUpdate, { action: 'pos-cash-alert', ...data });
    };

    // Notifications (IMPORTANT)
    const handleNotification = (data) => {
        addNotif(data.pesan || data.message || 'Notifikasi baru');
        emit('notifUpdate', notifUpdate, data);
        invalidate('app:notifications').catch(() => {});
    };

    // Order Status Changes (IMPORTANT)
    const handleOrderStatusChanged = (data) => {
        emit('salesOrderUpdate', salesOrderUpdate, data);
        addNotif(`📋 Order #${data.orderId} → ${data.status}`);
        invalidate('sales:orders').catch(() => {});
    };

    // Register event handlers
    eventHandlers.set('connected', handleConnected);
    eventHandlers.set('pos-transaction', handlePOSTransaction);
    eventHandlers.set('stock-updated', handleStockUpdated);
    eventHandlers.set('stock-alert', handleStockAlert);
    eventHandlers.set('ticket-message', handleTicketMessage);
    eventHandlers.set('pos-cash-alert', handlePOSAlert);
    eventHandlers.set('notification', handleNotification);
    eventHandlers.set('order-status-changed', handleOrderStatusChanged);

    // Subscribe to events
    for (const [event, handler] of eventHandlers) {
        await onSocketEvent(event, handler);
        channelNames.push(event);
    }

    // ─── NON-CRITICAL: Polling for Finance, Marketing, Sales Pipeline ─────
    pollingManager = new PollingManager({
        interval: 60000, // 60 seconds untuk non-critical
        callback: pollingCallback,
        lastUpdate: lastUpdate
    });
    pollingManager.start();
    channelNames.push('polling');

    activeChannels.set(channelNames);
}

/**
 * Subscribe ke channel spesifik tiket (untuk realtime reply di detail tiket)
 */
export async function subscribeToTicket(ticketId, onMessage) {
    if (!socketClient || typeof window === 'undefined') return () => {};
    
    try {
        await joinTicketRoom(ticketId);
        
        const handleTicketMessage = (data) => {
            onMessage(data);
        };
        
        await onSocketEvent('ticket-message', handleTicketMessage);
        eventHandlers.set(`ticket-${ticketId}`, handleTicketMessage);
        
        return () => unsubscribeFromTicket(ticketId);
    } catch (err) {
        console.error('[Realtime] Error subscribing to ticket:', err);
        return () => {};
    }
}

export async function unsubscribeFromTicket(ticketId) {
    try {
        await leaveTicketRoom(ticketId);
        const handler = eventHandlers.get(`ticket-${ticketId}`);
        if (handler) {
            await offSocketEvent('ticket-message', handler);
            eventHandlers.delete(`ticket-${ticketId}`);
        }
    } catch (err) {
        console.error('[Realtime] Error unsubscribing from ticket:', err);
    }
}

/**
 * Cleanup semua subscription
 */
export function cleanupRealtime() {
    // Stop polling if active
    if (pollingManager) {
        pollingManager.stop();
        pollingManager = null;
    }

    // Unsubscribe from Socket.io events
    if (socketClient) {
        for (const [event, handler] of eventHandlers) {
            try {
                offSocketEvent(event, handler);
            } catch (err) {
                console.error('[Realtime] Error unsubscribing from event:', event, err);
            }
        }
    }
    
    eventHandlers.clear();
    disconnectSocket();
    
    currentUnitId = null;
    currentSlug = null;
    currentUsername = null;
    currentUserId = null;
    isRealtimeConnected.set(false);
    activeChannels.set([]);
}
