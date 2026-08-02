/**
 * Polling utility for non-critical realtime updates
 * Used as fallback when Socket.io is not available or for non-critical events
 * 
 * OPTIMIZED: Longer intervals for non-critical events to reduce server load
 */

export class PollingManager {
    constructor(options = {}) {
        this.interval = options.interval || 60000; // Default 60 seconds (optimized for non-critical)
        this.callback = options.callback || null;
        this.isRunning = false;
        this.timerId = null;
        this.lastUpdate = options.lastUpdate || Date.now();
        this.errorCount = 0;
        this.maxErrors = 5;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.timerId = setInterval(async () => {
            if (this.callback) {
                try {
                    await this.callback(this.lastUpdate);
                    this.lastUpdate = Date.now();
                    this.errorCount = 0; // Reset error count on success
                } catch (error) {
                    this.errorCount++;
                    console.error('[Polling] Error:', error);
                    
                    // Exponential backoff on repeated errors
                    if (this.errorCount >= this.maxErrors) {
                        console.warn('[Polling] Too many errors, increasing interval');
                        this.updateInterval(this.interval * 2);
                        this.errorCount = 0;
                    }
                }
            }
        }, this.interval);
        
        console.log(`[Polling] Started with ${this.interval}ms interval (${this.interval / 1000}s)`);
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
        console.log(`[Polling] Interval updated to ${newInterval}ms (${newInterval / 1000}s)`);
    }

    // Adaptive polling based on user activity
    setAdaptiveMode(isActive) {
        if (isActive) {
            // More frequent when user is active
            this.updateInterval(30000); // 30 seconds
        } else {
            // Less frequent when user is inactive
            this.updateInterval(120000); // 2 minutes
        }
    }
}

/**
 * Polling intervals for different event types
 */
export const POLLING_INTERVALS = {
    CRITICAL: 10000,      // 10 seconds (fallback only)
    IMPORTANT: 30000,     // 30 seconds
    NORMAL: 60000,        // 60 seconds (default)
    LOW_PRIORITY: 120000, // 2 minutes
    BACKGROUND: 300000    // 5 minutes
};

/**
 * Check if Socket.io is available
 */
export function isSocketAvailable() {
    try {
        return typeof window !== 'undefined' && 
               window.io !== undefined;
    } catch {
        return false;
    }
}

/**
 * Create polling manager with smart fallback
 * Uses Socket.io for critical events, polling for non-critical
 */
export function createRealtimeManager(options = {}) {
    const useSocket = options.useSocket !== false && isSocketAvailable();
    
    if (useSocket) {
        console.log('[Realtime] Using Socket.io for critical events');
        return {
            type: 'socket',
            critical: true,
            polling: new PollingManager({
                interval: options.pollingInterval || POLLING_INTERVALS.NORMAL,
                callback: options.pollingCallback,
                lastUpdate: options.lastUpdate
            })
        };
    } else {
        console.log('[Realtime] Using Polling for all events');
        const polling = new PollingManager({
            interval: options.pollingInterval || POLLING_INTERVALS.IMPORTANT,
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
