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
import { invalidate, invalidateAll } from '$app/navigation';
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

/** Versi data terakhir yang dilihat polling (null = belum punya pembanding) */
let versiTerakhir = null;
let pollingDitolak = false;

/**
 * Polling cadangan: tanya nomor versi data unit; muat ulang hanya kalau berubah.
 * (Dulu setiap polling mengirim ulang transaksi terbaru sehingga dasbor menghitungnya berkali-kali.)
 */
async function pollingCallback() {
    if (pollingDitolak || !currentSlug) return;
    try {
        const response = await fetch(`/api/updates?slug=${encodeURIComponent(currentSlug)}`);
        if (response.status === 401 || response.status === 403) {
            // Sesi staf portal / sesi habis: polling tidak berlaku — berhenti, jangan spam server
            pollingDitolak = true;
            return;
        }
        if (!response.ok) return;
        const updates = await response.json();
        const versi = updates?.versi ?? null;
        if (versi === null) return;
        if (versiTerakhir !== null && versi !== versiTerakhir) {
            emit('financeUpdate', financeUpdate, { action: 'stats-updated', triggerRefresh: true, sumber: 'polling' });
            emit('stockUpdate', stockUpdate, { action: 'stock-updated', triggerRefresh: true, sumber: 'polling' });
            invalidate('app:finance').catch(() => {});
            invalidate('app:notifications').catch(() => {});
        }
        versiTerakhir = versi;
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
    versiTerakhir = null;
    pollingDitolak = false;
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
        invalidateAll().catch(() => {});
    };

    // Stock Alerts (CRITICAL)
    const handleStockAlert = (data) => {
        addNotif(`⚠️ ${data.message}`);
        emit('stockUpdate', stockUpdate, { ...data, action: 'stock-alert' });
    };

    // CS Ticket Messages (CRITICAL)
    const handleTicketMessage = (data) => {
        emit('csTicketUpdate', csTicketUpdate, { action: 'new-message', ...data });
    };

    // POS Cash Alerts (CRITICAL)
    const handlePOSAlert = (data) => {
        addNotif(`⚠️ Selisih Kas POS: Kasir ${data.cashier} memiliki selisih Rp ${data.selisih?.toLocaleString('id-ID') || 0} pada Shift #${data.shiftId}`);
        emit('financeUpdate', financeUpdate, { action: 'pos-cash-alert', ...data });
    };

    // Finance Transactions / Stats Updates (CRITICAL REALTIME)
    const handleStatsUpdated = (data) => {
        console.log('⚡ [Realtime] Stats updated received:', data);
        emit('financeUpdate', financeUpdate, { action: 'stats-updated', ...data });
        invalidate('app:finance').catch(() => {});
        invalidateAll().catch(() => {});
    };

    const handleNewTransaction = (data) => {
        console.log('⚡ [Realtime] New transaction received:', data);
        emit('financeUpdate', financeUpdate, { action: 'stats-updated', ...data });
        invalidate('app:finance').catch(() => {});
        invalidateAll().catch(() => {});
    };

    // Notifications (IMPORTANT)
    const handleNotification = (data) => {
        addNotif(data.pesan || data.message || 'Notifikasi baru');
        emit('notifUpdate', notifUpdate, data);
        invalidate('app:notifications').catch(() => {});
        if (data.kategori === 'FINANCE' || data.kategori === 'PRODUK') {
            invalidate('app:finance').catch(() => {});
            invalidateAll().catch(() => {});
        }
    };

    // Order Status Changes (IMPORTANT)
    const handleOrderStatusChanged = (data) => {
        emit('salesOrderUpdate', salesOrderUpdate, data);
        addNotif(`📋 Order #${data.orderId} → ${data.status}`);
        invalidate('sales:orders').catch(() => {});
        invalidateAll().catch(() => {});
    };

    // E-commerce order (status pengiriman) — dipakai halaman /ecommerce/[slug]/orders
    const handleEcommerceOrderUpdated = (data) => {
        emit('ecommerceOrderUpdate', ecommerceOrderUpdate, data);
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
    eventHandlers.set('ecommerce-order-updated', handleEcommerceOrderUpdated);
    eventHandlers.set('stats-updated', handleStatsUpdated);
    eventHandlers.set('new-transaction', handleNewTransaction);

    // Subscribe to events
    for (const [event, handler] of eventHandlers) {
        await onSocketEvent(event, handler);
        channelNames.push(event);
    }

    // ─── NON-CRITICAL: Polling for Finance, Marketing, Sales Pipeline ─────
    pollingManager = new PollingManager({
        interval: 15000, // 15 seconds fast fallback
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
