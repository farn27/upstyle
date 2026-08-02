/**
 * Socket.io Server with Redis Adapter
 * Handles critical realtime events for Upstyle platform
 * 
 * CRITICAL EVENTS (Realtime):
 * - POS transactions
 * - Stock alerts
 * - CS ticket messages
 * - POS cash alerts
 * 
 * NON-CRITICAL EVENTS (Polling):
 * - Finance stats
 * - Marketing campaigns
 * - Sales pipeline
 * - Reports
 */

import { Server } from 'socket.io';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.SOCKET_PORT || 13337;
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Validate environment
if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for Socket.io Redis adapter');
  process.exit(1);
}

// Create Socket.io server (without auto-listen)
const io = new Server({
  cors: {
    origin: ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis client for pub/sub (using Upstash)
const redisPublisher = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN
});

const redisSubscriber = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN
});

console.log('✅ Redis clients initialized');

// Note: Upstash Redis is used for HTTP API fallback, not for Socket.io adapter
// Socket.io will use its default in-memory adapter for single-server setup
// For multi-server scaling, you would use a traditional Redis with socket.io-redis

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const unitId = socket.handshake.auth.unitId;
    const userId = socket.handshake.auth.userId;
    
    if (!token || !unitId) {
      return next(new Error('Authentication error: Missing token or unitId'));
    }

    // Simple token validation for now
    // In production, integrate with your existing session system
    // For development, we'll accept any valid-looking token
    if (token.length < 10) {
      return next(new Error('Authentication error: Invalid token format'));
    }

    socket.data.unitId = unitId;
    socket.data.userId = userId;
    next();
  } catch (err) {
    console.error('[Socket Auth] Error:', err);
    next(new Error('Authentication error'));
  }
});

// Connection handling
io.on('connection', (socket) => {
  const { unitId, userId } = socket.data;
  console.log(`🔌 Client connected: ${socket.id} (Unit: ${unitId}, User: ${userId})`);

  // Join unit room
  const unitRoom = `unit-${unitId}`;
  socket.join(unitRoom);

  // Send connection confirmation
  socket.emit('connected', {
    socketId: socket.id,
    unitId,
    userId,
    timestamp: new Date().toISOString()
  });

  // ─── CRITICAL: POS Transactions ────────────────────────────────
  socket.on('pos-transaction', (data) => {
    // Broadcast to all users in the same unit
    io.to(unitRoom).emit('pos-transaction', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`🛒 POS Transaction: Unit ${unitId}, Order #${data.orderNumber}`);
  });

  // ─── CRITICAL: Stock Updates ───────────────────────────────────
  socket.on('stock-updated', (data) => {
    io.to(unitRoom).emit('stock-updated', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`📦 Stock Updated: Unit ${unitId}, Product ${data.productId}`);
  });

  // ─── CRITICAL: Stock Alerts ────────────────────────────────────
  socket.on('stock-alert', (data) => {
    io.to(unitRoom).emit('stock-alert', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`⚠️ Stock Alert: Unit ${unitId}, ${data.message}`);
  });

  // ─── CRITICAL: CS Ticket Messages ─────────────────────────────
  socket.on('join-ticket', (ticketId) => {
    const ticketRoom = `ticket-${ticketId}`;
    socket.join(ticketRoom);
    socket.emit('joined-ticket', { ticketId });
    console.log(`🎫 Joined ticket: ${ticketId}`);
  });

  socket.on('leave-ticket', (_ticketId) => {
    const ticketRoom = `ticket-${ticketId}`;
    socket.leave(ticketRoom);
    socket.emit('left-ticket', { ticketId });
    console.log(`🎫 Left ticket: ${ticketId}`);
  });

  socket.on('ticket-message', (data) => {
    const { ticketId, message, sender } = data;
    const ticketRoom = `ticket-${ticketId}`;
    
    io.to(ticketRoom).emit('ticket-message', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`💬 Ticket Message: Ticket ${ticketId}, Sender ${sender}`);
  });

  // ─── CRITICAL: POS Cash Alerts ────────────────────────────────
  socket.on('pos-cash-alert', (data) => {
    io.to(unitRoom).emit('pos-cash-alert', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`💰 POS Cash Alert: Unit ${unitId}, Shift #${data.shiftId}`);
  });

  // ─── IMPORTANT: Notifications ─────────────────────────────────
  socket.on('notification', (data) => {
    io.to(unitRoom).emit('notification', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`🔔 Notification: Unit ${unitId}`);
  });

  // ─── IMPORTANT: Order Status Updates ───────────────────────────
  socket.on('order-status-changed', (data) => {
    io.to(unitRoom).emit('order-status-changed', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`📋 Order Status: Unit ${unitId}, Order #${data.orderId}`);
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });

  // Error handling
  socket.on('error', (err) => {
    console.error(`[Socket Error] ${socket.id}:`, err);
  });

  // Ping/Pong for health check
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// HTTP API for server-to-client event triggering
import express from 'express';
import cors from 'cors';

const app = express();
const API_PORT = process.env.SOCKET_API_PORT || 13338;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY || 'internal';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size,
    rooms: Array.from(io.sockets.adapter.rooms.keys())
  });
});

// Emit event endpoint (for server-to-client communication)
app.post('/emit', (req, res) => {
  const { room, event, data } = req.body;
  
  // Simple API key authentication
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== SOCKET_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!room || !event) {
    return res.status(400).json({ error: 'Missing room or event' });
  }
  
  try {
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
    
    console.log(`📡 HTTP API: ${room} -> ${event}`);
    res.json({ success: true, room, event });
  } catch (err) {
    console.error('[HTTP API] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start HTTP API server
app.listen(API_PORT, () => {
  console.log(`🌐 Socket.io HTTP API running on port ${API_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  io.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  io.close(() => {
    process.exit(0);
  });
});

// Start server
io.listen(PORT);
console.log(`🚀 Socket.io server running on port ${PORT}`);
console.log(`📡 Origin: ${ORIGIN}`);
console.log(`🔗 Redis: ${UPSTASH_REDIS_REST_URL}`);
