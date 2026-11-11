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
import { env } from '$env/dynamic/public';

let socketInstance = null;
let connectionPromise = null;
let currentAuthUnitId = null;

/**
 * Minta token Socket.io ke server web (dicek: user/staff berhak atas unit ini).
 * @param {number|string} unitId
 * @returns {Promise<string>}
 */
async function fetchSocketToken(unitId) {
  const res = await fetch(`/api/socket-token?unitId=${encodeURIComponent(unitId)}`, {
    credentials: 'same-origin'
  });
  if (!res.ok) throw new Error(`Socket token ditolak (${res.status})`);
  const body = await res.json();
  return body.token;
}

/**
 * Get or create Socket.io client instance
 * @param {Object} auth - { unitId } — token diambil otomatis dari /api/socket-token
 * @returns {Promise<Socket>}
 */
export const getSocketClient = async (auth = {}) => {
  if (typeof window === 'undefined') return null;

  if (auth.unitId) currentAuthUnitId = auth.unitId;

  // Return existing instance if connected and auth matches
  if (socketInstance?.connected) {
    return socketInstance;
  }

  // Wait for existing connection attempt
  if (connectionPromise) {
    return connectionPromise;
  }

  // Tanpa unit tidak bisa minta token — jangan connect anonim
  if (!currentAuthUnitId) {
    return null;
  }

  // Create new connection
  connectionPromise = new Promise((resolve, reject) => {
    try {
      const socketUrl = env.PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
      
      socketInstance = io(socketUrl, {
        // Dipanggil di setiap (re)connect → selalu pakai token segar
        auth: (cb) => {
          fetchSocketToken(currentAuthUnitId)
            .then((token) => cb({ token }))
            .catch((err) => {
              console.warn('[Socket] Gagal ambil token:', err.message);
              cb({});
            });
        },
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
    currentAuthUnitId = null;
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

// Event bisnis dikirim oleh server web (POST /emit di socket-server), bukan oleh peramban.


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
