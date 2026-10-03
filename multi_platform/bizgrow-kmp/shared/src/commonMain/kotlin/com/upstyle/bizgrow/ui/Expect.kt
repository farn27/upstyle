package com.upstyle.bizgrow.ui

import kotlinx.coroutines.flow.StateFlow

expect fun currentTimeMillis(): Long

/**
 * Multiplatform connectivity monitor.
 * Android: backed by ConnectivityManager network callbacks.
 * iOS: defaults to online (NWPathMonitor integration is a future improvement).
 */
expect class ConnectivityMonitor {
    val isOnline: StateFlow<Boolean>
}
