package com.upstyle.bizgrow.utils

import com.upstyle.bizgrow.data.SessionRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

class CacheManager(private val session: SessionRepository) {
    // Dummy implementation to satisfy AppViewModel
}

sealed class RealtimeEvent {
    object PosTransaction : RealtimeEvent()
    object StockUpdated : RealtimeEvent()
    object StockAlert : RealtimeEvent()
    object Notification : RealtimeEvent()
    object OrderStatusChanged : RealtimeEvent()
    object PosCashAlert : RealtimeEvent()
    data class TicketMessage(val ticketId: Int) : RealtimeEvent()
    object Connected : RealtimeEvent()
    object Disconnected : RealtimeEvent()
}

object SocketManager {
    private val _events = MutableSharedFlow<RealtimeEvent>()
    val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    fun joinUnit(unitId: Int) {}
    fun connect(url: String, unitId: Int, userId: Int, token: String) {}
}
