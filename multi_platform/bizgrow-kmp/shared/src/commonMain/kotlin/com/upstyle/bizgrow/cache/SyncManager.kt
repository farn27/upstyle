package com.upstyle.bizgrow.cache

import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.ui.ConnectivityMonitor
import com.upstyle.bizgrow.ui.currentTimeMillis
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

/**
 * Observes connectivity and flushes the SyncQueue when the device comes back online.
 * Construct once per app lifecycle and keep alive as long as the app runs.
 */
class SyncManager(
    private val syncQueue: SyncQueue,
    private val api: UpstyleApi,
    private val connectivity: ConnectivityMonitor,
    private val scope: CoroutineScope,
    private val unitId: Int
) {
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _lastSyncAt = MutableStateFlow(0L)
    val lastSyncAt: StateFlow<Long> = _lastSyncAt.asStateFlow()

    init {
        scope.launch {
            connectivity.isOnline
                .distinctUntilChanged()
                .filter { it } // react only when going from offline → online
                .collect { flushQueue() }
        }
    }

    /**
     * Attempts to send all queued items to the server.
     * No-ops if already syncing or if the queue is empty.
     * On success clears the queue and records the sync timestamp.
     * On failure leaves the queue intact for the next connectivity event.
     */
    suspend fun flushQueue() {
        if (_isSyncing.value) return
        val items = syncQueue.getAll()
        if (items.isEmpty()) return

        _isSyncing.value = true
        try {
            val result = api.flushSyncQueue(unitId, items)
            if (result.success) {
                syncQueue.clear()
                _lastSyncAt.value = currentTimeMillis()
            }
        } catch (e: Exception) {
            // Will retry automatically on the next connectivity event
        } finally {
            _isSyncing.value = false
        }
    }
}
