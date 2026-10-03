package com.upstyle.bizgrow.ui

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

actual class ConnectivityMonitor {
    private val _isOnline = MutableStateFlow(true) // Assume online by default
    actual val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    // TODO: Integrate NWPathMonitor via Swift interop for production-grade detection.
    // Swift side can call updateStatus(online: Bool) on this object via the KMP bridge.
    fun updateStatus(online: Boolean) {
        _isOnline.value = online
    }
}
