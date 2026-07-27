/**
 * realtimeStore.js — Global Realtime Manager
 * Mengelola semua Pusher subscription secara terpusat.
 * 
 * FILOSOFI: Tidak pakai invalidateAll() yang trigger full reload.
 * Sebagai gantinya: update store secara langsung (optimistic),
 * invalidate hanya untuk route yang relevan saja.
 * 
 * FALLBACK: Jika Pusher tidak tersedia, gunakan polling sebagai alternatif.
 */

import { writable, derived } from 'svelte/store';
import { getPusherClient } from '$lib/pusher';
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
let pusherClient = null;
let currentUnitId = null;
let currentSlug = null;
let currentUsername = null;
let subscribedChannels = new Map(); // channelName → channel object
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
 * Checks for updates via API when Pusher is not available
 */
async function pollingCallback() {
    try {
        const response = await fetch(`/api/updates?slug=${currentSlug}&lastUpdate=${lastUpdate}&type=all`);
        const updates = await response.json();

        if (updates.transactions && updates.transactions.length > 0) {
            // Simulate Pusher events for transactions
            updates.transactions.forEach(trx => {
                emit('financeUpdate', financeUpdate, {
                    action: 'stats-updated',
                    newTransaction: trx
                });
            });
        }

        if (updates.products && updates.products.length > 0) {
            // Simulate Pusher events for products
            updates.products.forEach(prod => {
                emit('stockUpdate', stockUpdate, {
                    action: 'stock-updated',
                    product: prod
                });
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
export function initGlobalRealtime(unitId, slug, username) {
    if (typeof window === 'undefined') return;
    if (currentUnitId === unitId && currentSlug === slug) return;

    // Cleanup existing sebelum reinit
    cleanupRealtime();

    currentUnitId = unitId;
    currentSlug = slug;
    currentUsername = username;

    // Try to use Pusher first
    try {
        pusherClient = getPusherClient();
        usePolling = false;
        console.log('[Realtime] Using Pusher');
    } catch (pusherError) {
        console.warn('[Realtime] Pusher not available, falling back to polling:', pusherError);
        usePolling = true;
        pusherClient = null;
    }

    const channelNames = [];

    if (usePolling) {
        // Use polling instead of Pusher
        pollingManager = new PollingManager({
            interval: 5000, // 5 seconds
            callback: pollingCallback,
            lastUpdate: lastUpdate
        });
        pollingManager.start();
        isRealtimeConnected.set(true);
        activeChannels.set(['polling']);
        return;
    }

    // ─── 1. Channel Global Bizgrow (notifikasi lintas sistem) ──────────────
    const globalChannel = pusherClient.subscribe('channel-bizgrow');
    subscribedChannels.set('channel-bizgrow', globalChannel);
    channelNames.push('channel-bizgrow');

    globalChannel.bind('notif-baru', (data) => {
        addNotif(data.pesan || 'Notifikasi baru');
        emit('notifUpdate', notifUpdate, data);
        // Invalidate notification data saja, bukan seluruh halaman
        invalidate('app:notifications').catch(() => {});
    });

    globalChannel.bind('cache-cleared', () => {
        // Server sudah clear cache, kita trigger re-fetch data yang relevan
        if (slug) {
            invalidate(`sales:orders`).catch(() => {});
            invalidate(`sales:pipeline`).catch(() => {});
            invalidate(`marketing:leads`).catch(() => {});
        }
    });

    // ─── 2. Channel Private Unit (produk, stok) ────────────────────────────
    if (unitId) {
        const privateChannel = pusherClient.subscribe(`private-unit-${unitId}`);
        subscribedChannels.set(`private-unit-${unitId}`, privateChannel);
        channelNames.push(`private-unit-${unitId}`);

        privateChannel.bind('pusher:subscription_succeeded', () => {
            isRealtimeConnected.set(true);
        });

        privateChannel.bind('product-added', (data) => {
            addNotif(data.message || '📦 Produk baru ditambahkan');
            emit('stockUpdate', stockUpdate, data);
        });

        privateChannel.bind('stock-updated', (data) => {
            addNotif(data.message || '📦 Stok diperbarui');
            emit('stockUpdate', stockUpdate, { ...data, action: 'stock-updated' });
        });

        privateChannel.bind('stock-alert', (data) => {
            addNotif(`⚠️ ${data.message}`);
        });
    }

    // ─── 3. Channel Finance (transaksi, POS, laporan) ──────────────────────
    if (slug) {
        const financeChannel = pusherClient.subscribe(`finance-${slug}`);
        subscribedChannels.set(`finance-${slug}`, financeChannel);
        channelNames.push(`finance-${slug}`);

        financeChannel.bind('stats-updated', (data) => {
            emit('financeUpdate', financeUpdate, { action: 'stats-updated', ...data });
            // Targeted invalidation — hanya data finance, bukan seluruh halaman
            invalidate('app:finance').catch(() => {});
        });

        financeChannel.bind('report-ready', (data) => {
            addNotif(`📊 ${data.message || 'Laporan keuangan siap diunduh'}`);
        });

        financeChannel.bind('payroll-notified', (data) => {
            addNotif(`💰 ${data.message || 'Slip gaji terkirim'}`);
        });

        financeChannel.bind('cache-cleared', () => {
            invalidate('app:finance').catch(() => {});
        });

        // POS Realtime Events
        financeChannel.bind('pos-transaction-new', (data) => {
            addNotif(`🛒 Pesanan POS Baru: ${data.orderNumber} (${data.customerName})`);
            invalidate('app:finance').catch(() => {});
            invalidate('app:pos').catch(() => {}); // update riwayat/report POS
        });

        financeChannel.bind('pos-stock-updated', (data) => {
            // Kita tidak perlu memunculkan notif ke kasir untuk setiap update stok,
            // tapi kita perlu invalidate state agar list produk di POS terupdate
            invalidate('app:pos:products').catch(() => {});
        });

        financeChannel.bind('pos-cash-alert', (data) => {
            addNotif(`⚠️ Selisih Kas POS: Kasir ${data.cashier} memiliki selisih Rp ${data.selisih.toLocaleString('id-ID')} pada Shift #${data.shiftId}`);
        });

        // ─── 4. Channel Sales ──────────────────────────────────────────────
        const salesChannel = pusherClient.subscribe(`sales-${slug}`);
        subscribedChannels.set(`sales-${slug}`, salesChannel);
        channelNames.push(`sales-${slug}`);

        salesChannel.bind('pipeline-updated', (data) => {
            emit('salesPipelineUpdate', salesPipelineUpdate, data);
            // Jangan invalidate seluruh halaman — update store saja
            // UI pipeline sudah reactive terhadap salesPipelineUpdate
        });

        salesChannel.bind('order-updated', (data) => {
            emit('salesOrderUpdate', salesOrderUpdate, data);
            invalidate('sales:orders').catch(() => {});
        });

        salesChannel.bind('order-status-changed', (data) => {
            emit('salesOrderUpdate', salesOrderUpdate, data);
            addNotif(`📋 Order #${data.orderId} → ${data.status}`);
            invalidate('sales:orders').catch(() => {});
        });

        // ─── 5. Channel Marketing ──────────────────────────────────────────
        const marketingChannel = pusherClient.subscribe(`marketing-${slug}`);
        subscribedChannels.set(`marketing-${slug}`, marketingChannel);
        channelNames.push(`marketing-${slug}`);

        marketingChannel.bind('lead-transferred', (data) => {
            emit('marketingLeadUpdate', marketingLeadUpdate, data);
            addNotif(`🎯 Lead "${data.nama}" berhasil masuk CRM`);
            invalidate('marketing:leads').catch(() => {});
        });

        marketingChannel.bind('campaign-created', (data) => {
            addNotif(`📣 Kampanye baru: ${data.name}`);
            invalidate('marketing:campaign').catch(() => {});
        });

        marketingChannel.bind('campaign-updated', (data) => {
            invalidate('marketing:campaign').catch(() => {});
        });

        // ─── 6. Channel CS ─────────────────────────────────────────────────
        const csChannel = pusherClient.subscribe(`cs-${slug}`);
        subscribedChannels.set(`cs-${slug}`, csChannel);
        channelNames.push(`cs-${slug}`);

        csChannel.bind('ticket-new', (data) => {
            emit('csTicketUpdate', csTicketUpdate, { action: 'new', ...data });
            addNotif(`🎫 Tiket baru: "${data.subject}" [${data.priority}]`);
        });

        csChannel.bind('ticket-new-notification', (data) => {
            addNotif(data.message || '🎫 Tiket baru masuk');
        });

        csChannel.bind('ticket-updated', (data) => {
            emit('csTicketUpdate', csTicketUpdate, { action: 'updated', ...data });
            invalidate('cs:dashboard').catch(() => {});
        });
    }

    // ─── 7. Individual ticket channels (untuk realtime reply) ──────────────
    // Akan di-subscribe secara on-demand dari halaman tiket spesifik

    activeChannels.set(channelNames);
}

/**
 * Subscribe ke channel spesifik tiket (untuk realtime reply di detail tiket)
 */
export function subscribeToTicket(ticketId, onMessage) {
    if (!pusherClient || typeof window === 'undefined') return () => {};
    const channelName = `cs-ticket-${ticketId}`;
    if (subscribedChannels.has(channelName)) {
        subscribedChannels.get(channelName).bind('new-message', onMessage);
    } else {
        const ch = pusherClient.subscribe(channelName);
        subscribedChannels.set(channelName, ch);
        ch.bind('new-message', onMessage);
    }
    return () => unsubscribeFromTicket(ticketId);
}

export function unsubscribeFromTicket(ticketId) {
    const channelName = `cs-ticket-${ticketId}`;
    if (pusherClient && subscribedChannels.has(channelName)) {
        pusherClient.unsubscribe(channelName);
        subscribedChannels.delete(channelName);
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

    // Unsubscribe from Pusher channels
    if (pusherClient) {
        for (const [name] of subscribedChannels) {
            try { pusherClient.unsubscribe(name); } catch {}
        }
    }
    subscribedChannels.clear();
    currentUnitId = null;
    currentSlug = null;
    currentUsername = null;
    isRealtimeConnected.set(false);
    activeChannels.set([]);
}
