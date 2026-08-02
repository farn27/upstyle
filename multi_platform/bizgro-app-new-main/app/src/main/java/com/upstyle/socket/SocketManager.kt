package com.upstyle.socket

import android.util.Log
import com.upstyle.data.SessionManager
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.json.JSONObject
import java.net.URI

/**
 * Manages Socket.io connection to Upstyle realtime server.
 *
 * Usage:
 *   SocketManager.connect(unitId, userId, token)
 *   SocketManager.events.collect { event -> ... }
 *   SocketManager.disconnect()
 */
object SocketManager {

    private const val TAG = "SocketManager"

    sealed class RealtimeEvent {
        data class PosTransaction(val data: JSONObject) : RealtimeEvent()
        data class StockUpdated(val data: JSONObject) : RealtimeEvent()
        data class StockAlert(val data: JSONObject) : RealtimeEvent()
        data class Notification(val data: JSONObject) : RealtimeEvent()
        data class OrderStatusChanged(val data: JSONObject) : RealtimeEvent()
        data class PosCashAlert(val data: JSONObject) : RealtimeEvent()
        data class TicketMessage(val data: JSONObject) : RealtimeEvent()
        data class Connected(val socketId: String) : RealtimeEvent()
        object Disconnected : RealtimeEvent()
    }

    private val _events = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 64)
    val events = _events.asSharedFlow()

    private var socket: Socket? = null
    private var isConnecting = false

    fun connect(unitId: Int, userId: Int, token: String) {
        if (socket?.connected() == true) return
        if (isConnecting) return

        val socketUrl = getSocketUrl()
        if (socketUrl.isEmpty()) {
            Log.w(TAG, "Socket URL is empty, skipping connection")
            return
        }

        isConnecting = true

        try {
            val options = IO.Options().apply {
                auth = mapOf(
                    "token" to token,
                    "unitId" to unitId,
                    "userId" to userId
                )
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
                timeout = 10000
            }

            socket = IO.socket(URI.create(socketUrl), options).apply {

                on(Socket.EVENT_CONNECT) {
                    isConnecting = false
                    Log.i(TAG, "Connected: $id")
                    _events.tryEmit(RealtimeEvent.Connected(id ?: ""))
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

                on("pos-transaction") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.PosTransaction(it))
                    }
                }

                on("stock-updated") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.StockUpdated(it))
                    }
                }

                on("stock-alert") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.StockAlert(it))
                    }
                }

                on("notification") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.Notification(it))
                    }
                }

                on("order-status-changed") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.OrderStatusChanged(it))
                    }
                }

                on("pos-cash-alert") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.PosCashAlert(it))
                    }
                }

                on("ticket-message") { args ->
                    (args.firstOrNull() as? JSONObject)?.let {
                        _events.tryEmit(RealtimeEvent.TicketMessage(it))
                    }
                }

                connect()
            }

            Log.i(TAG, "Connecting to $socketUrl")

        } catch (e: Exception) {
            isConnecting = false
            Log.e(TAG, "Failed to create socket: ${e.message}")
        }
    }

    fun joinTicket(ticketId: Int) {
        socket?.emit("join-ticket", ticketId)
    }

    fun leaveTicket(ticketId: Int) {
        socket?.emit("leave-ticket", ticketId)
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnecting = false
        Log.i(TAG, "Disconnected")
    }

    fun isConnected(): Boolean = socket?.connected() == true

    /**
     * Derive socket URL from server URL.
     * Server URL example: http://192.168.1.10:5173
     * Socket URL example: http://192.168.1.10:13337
     */
    private fun getSocketUrl(): String {
        return try {
            val serverUrl = SessionManager.getServerUrl()
            val uri = URI.create(serverUrl)
            // Use SOCKET_PORT from server config (default 13337)
            "${uri.scheme}://${uri.host}:13337"
        } catch (e: Exception) {
            ""
        }
    }
}
