package com.upstyle.bizgrow.socket

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.json.JSONObject
import java.net.URI

/**
 * Socket.io realtime manager — Android only.
 */
actual object SocketManager {

    private const val TAG = "SocketManager"



    private val _events = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 64)
    actual val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    private var socket: Socket? = null
    private var isConnecting = false

    actual fun connect(serverUrl: String, unitId: Int, userId: Int, token: String) {
        if (socket?.connected() == true) return
        if (isConnecting) return
        if (token.isEmpty()) return

        val socketUrl = deriveSocketUrl(serverUrl)
        if (socketUrl.isEmpty()) {
            Log.w(TAG, "Cannot derive socket URL from: $serverUrl")
            return
        }

        isConnecting = true
        Log.i(TAG, "Connecting to $socketUrl")

        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to token, "unitId" to unitId.toString(), "userId" to userId.toString())
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
                timeout = 10000
            }

            socket = IO.socket(URI.create(socketUrl), options).apply {
                on(Socket.EVENT_CONNECT) {
                    isConnecting = false
                    Log.i(TAG, "Connected: ${this@apply.id()}")
                    _events.tryEmit(RealtimeEvent.Connected(this@apply.id() ?: ""))
                }
                on(Socket.EVENT_DISCONNECT) { args ->
                    isConnecting = false
                    Log.i(TAG, "Disconnected: ${args.firstOrNull()}")
                    _events.tryEmit(RealtimeEvent.Disconnected)
                }
                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    isConnecting = false
                    Log.e(TAG, "Connect error: ${args.firstOrNull()}")
                }
                on("pos-transaction") { args -> emit(RealtimeEvent.PosTransaction(args.jsonString())) }
                on("pos-transaction-new") { args -> emit(RealtimeEvent.PosTransaction(args.jsonString())) }
                on("stock-updated") { args -> emit(RealtimeEvent.StockUpdated(args.jsonString())) }
                on("pos-stock-updated") { args -> emit(RealtimeEvent.StockUpdated(args.jsonString())) }
                on("stock-alert") { args -> emit(RealtimeEvent.StockAlert(args.jsonString())) }
                on("notification") { args -> emit(RealtimeEvent.Notification(args.jsonString())) }
                on("notif-baru") { args -> emit(RealtimeEvent.Notification(args.jsonString())) }
                on("order-status-changed") { args -> emit(RealtimeEvent.OrderStatusChanged(args.jsonString())) }
                on("pos-cash-alert") { args -> emit(RealtimeEvent.PosCashAlert(args.jsonString())) }
                on("ticket-message") { args -> emit(RealtimeEvent.TicketMessage(args.jsonString())) }
                on("stats-updated") { args -> emit(RealtimeEvent.StockUpdated(args.jsonString())) }
                connect()
            }
        } catch (e: Exception) {
            isConnecting = false
            Log.e(TAG, "Failed to create socket: ${e.message}")
        }
    }

    private fun emit(event: RealtimeEvent) = _events.tryEmit(event)

    private fun Array<Any>.jsonString(): String {
        val first = firstOrNull()
        return if (first is JSONObject) first.toString() else first?.toString() ?: "{}"
    }

    actual fun joinUnit(unitId: Int) { socket?.emit("join-unit", unitId) }
    actual fun joinTicket(ticketId: Int) { socket?.emit("join-ticket", ticketId) }
    actual fun leaveTicket(ticketId: Int) { socket?.emit("leave-ticket", ticketId) }

    actual fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnecting = false
        Log.i(TAG, "Disconnected")
    }

    actual fun isConnected(): Boolean = socket?.connected() == true

    private fun deriveSocketUrl(serverUrl: String): String = try {
        val uri = URI.create(serverUrl.trimEnd('/'))
        "${uri.scheme}://${uri.host}:13337"
    } catch (_: Exception) { "" }
}
