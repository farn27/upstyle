package com.upstyle.bizgrow.socket

import kotlinx.coroutines.flow.SharedFlow

sealed class RealtimeEvent {
    data class PosTransaction(val data: String) : RealtimeEvent()
    data class StockUpdated(val data: String) : RealtimeEvent()
    data class StockAlert(val data: String) : RealtimeEvent()
    data class Notification(val data: String) : RealtimeEvent()
    data class OrderStatusChanged(val data: String) : RealtimeEvent()
    data class PosCashAlert(val data: String) : RealtimeEvent()
    data class TicketMessage(val data: String) : RealtimeEvent()
    data class Connected(val socketId: String) : RealtimeEvent()
    object Disconnected : RealtimeEvent()
}

expect object SocketManager {

    val events: SharedFlow<RealtimeEvent>

    fun connect(serverUrl: String, unitId: Int, userId: Int, token: String)
    fun disconnect()
    fun isConnected(): Boolean
    
    fun joinUnit(unitId: Int)
    fun joinTicket(ticketId: Int)
    fun leaveTicket(ticketId: Int)
}
