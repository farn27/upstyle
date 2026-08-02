/**
 * Socket.io Client Library
 * Handles Socket.io connection for critical realtime events
 * 
 * CRITICAL EVENTS (Socket.io):
 * - pos-transaction
 * - stock-updated
 * - stock-alert
 * - ticket-message
 * - pos-cash-alert
 * - notification
 * - order-status-changed
 */

import { io } from 'socket.io-client';
import { PUBLIC_SOCKET_URL } from '$env/static/public';

let socketInstance = null;
let connectionPromise = null;

/**
 * Get or create Socket.io client instance
 * @param {Object} auth - Authentication data { token, unitId, userId }
 * @returns {Promise<Socket>}
 */
export const getSocketClient = async (auth = {}) => {
  if (typeof window === 'undefined') return null;

  // Return existing instance if connected and auth matches
  if (socketInstance?.connected) {
    return socketInstance;
  }

  // Wait for existing connection attempt
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = new Promise((resolve, reject) => {
    try {
      const socketUrl = PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
      
      socketInstance = io(socketUrl, {
        auth,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket.io connected:', socketInstance.id);
        connectionPromise = null;
        resolve(socketInstance);
      });

      socketInstance.on('connect_error', (err) => {
        console.error('❌ Socket.io connection error:', err);
        connectionPromise = null;
        reject(err);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket.io disconnected:', reason);
        connectionPromise = null;
      });

      // Connection timeout
      setTimeout(() => {
        if (!socketInstance.connected) {
          connectionPromise = null;
          reject(new Error('Socket.io connection timeout'));
        }
      }, 10000);

    } catch (err) {
      connectionPromise = null;
      reject(err);
    }
  });

  return connectionPromise;
};

/**
 * Disconnect Socket.io client
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connectionPromise = null;
    console.log('🔌 Socket.io disconnected');
  }
};

/**
 * Reconnect Socket.io with new auth
 * @param {Object} auth - New authentication data
 */
export const reconnectSocket = async (auth) => {
  disconnectSocket();
  return getSocketClient(auth);
};

/**
 * Check if Socket.io is connected
 * @returns {boolean}
 */
export const isSocketConnected = () => {
  return socketInstance?.connected || false;
};

/**
 * Join a ticket room for CS chat
 * @param {string} ticketId - Ticket ID
 */
export const joinTicketRoom = async (ticketId) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('join-ticket', ticketId);
  }
};

/**
 * Leave a ticket room
 * @param {string} ticketId - Ticket ID
 */
export const leaveTicketRoom = async (ticketId) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('leave-ticket', ticketId);
  }
};

/**
 * Send ticket message
 * @param {Object} data - Message data { ticketId, message, sender }
 */
export const sendTicketMessage = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('ticket-message', data);
  }
};

/**
 * Emit POS transaction event
 * @param {Object} data - Transaction data
 */
export const emitPOSTransaction = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('pos-transaction', data);
  }
};

/**
 * Emit stock update event
 * @param {Object} data - Stock update data
 */
export const emitStockUpdate = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('stock-updated', data);
  }
};

/**
 * Emit stock alert event
 * @param {Object} data - Alert data
 */
export const emitStockAlert = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('stock-alert', data);
  }
};

/**
 * Emit POS cash alert event
 * @param {Object} data - Cash alert data
 */
export const emitPOSAlert = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('pos-cash-alert', data);
  }
};

/**
 * Emit notification event
 * @param {Object} data - Notification data
 */
export const emitNotification = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('notification', data);
  }
};

/**
 * Emit order status change event
 * @param {Object} data - Order status data
 */
export const emitOrderStatusChange = async (data) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.emit('order-status-changed', data);
  }
};

/**
 * Subscribe to Socket.io events
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 */
export const onSocketEvent = async (event, callback) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Unsubscribe from Socket.io events
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 */
export const offSocketEvent = async (event, callback) => {
  const socket = await getSocketClient();
  if (socket) {
    socket.off(event, callback);
  }
};

export default getSocketClient;
