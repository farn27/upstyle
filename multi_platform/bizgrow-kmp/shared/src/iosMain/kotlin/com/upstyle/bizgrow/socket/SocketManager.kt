package com.upstyle.bizgrow.socket

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import io.github.aakira.napier.Napier

/**
 * Socket.io realtime manager — iOS Stub.
 * Wait for KMP Socket.io client or native Swift implementation.
 */
actual object SocketManager {



    private val _events = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 64)
    actual val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    actual fun connect(serverUrl: String, unitId: Int, userId: Int, token: String) {
        Napier.w("SocketManager is not implemented on iOS yet.", tag = "SocketManager")
    }

    actual fun joinUnit(unitId: Int) {}
    actual fun joinTicket(ticketId: Int) {}
    actual fun leaveTicket(ticketId: Int) {}

    actual fun disconnect() {}

    actual fun isConnected(): Boolean = false
}
