/**
 * Polling utility for realtime updates when Pusher is not available
 * This provides a fallback mechanism for multi-user sync without external services
 */

export class PollingManager {
    constructor(options = {}) {
        this.interval = options.interval || 5000; // Default 5 seconds
        this.callback = options.callback || null;
        this.isRunning = false;
        this.timerId = null;
        this.lastUpdate = options.lastUpdate || Date.now();
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.timerId = setInterval(async () => {
            if (this.callback) {
                try {
                    await this.callback(this.lastUpdate);
                    this.lastUpdate = Date.now();
                } catch (error) {
                    console.error('[Polling] Error:', error);
                }
            }
        }, this.interval);
        
        console.log(`[Polling] Started with ${this.interval}ms interval`);
    }

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isRunning = false;
        console.log('[Polling] Stopped');
    }

    updateInterval(newInterval) {
        this.stop();
        this.interval = newInterval;
        if (this.isRunning) {
            this.start();
        }
    }
}

/**
 * Check if Pusher is available
 */
export function isPusherAvailable() {
    try {
        return typeof window !== 'undefined' && 
               window.Pusher !== undefined && 
               window.PUSHER_CONFIG?.key;
    } catch {
        return false;
    }
}

/**
 * Create polling manager with auto-fallback
 * Uses Pusher if available, otherwise falls back to polling
 */
export function createRealtimeManager(options = {}) {
    const usePusher = options.usePusher !== false && isPusherAvailable();
    
    if (usePusher) {
        console.log('[Realtime] Using Pusher');
        return {
            type: 'pusher',
            channel: options.pusherChannel,
            events: options.pusherEvents || {},
            subscribe: (callback) => {
                // Pusher subscription logic would go here
                console.log('[Realtime] Pusher subscription');
            },
            unsubscribe: () => {
                console.log('[Realtime] Pusher unsubscription');
            }
        };
    } else {
        console.log('[Realtime] Using Polling fallback');
        const polling = new PollingManager({
            interval: options.pollingInterval || 5000,
            callback: options.pollingCallback,
            lastUpdate: options.lastUpdate
        });
        
        return {
            type: 'polling',
            manager: polling,
            subscribe: () => polling.start(),
            unsubscribe: () => polling.stop()
        };
    }
}
