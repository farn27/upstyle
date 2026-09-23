/**
 * Socket.io Server
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
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Railway injects PORT automatically, fallback to 3000
const PORT = process.env.PORT || process.env.SOCKET_PORT || 3000;

// Support multiple origins (comma-separated)
// e.g. ORIGIN="https://upstyle.vercel.app,http://localhost:5173"
const ORIGIN_ENV = process.env.ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = ORIGIN_ENV.split(',').map((o) => o.trim());

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY || 'internal';

// Validate environment
if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
  process.exit(1);
}

// ─── Express App ───────────────────────────────────────────────
const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// ─── Shared HTTP Server (Express + Socket.io on same port) ─────
const httpServer = createServer(app);

// ─── Socket.io Server ─────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ─── Redis Clients (Upstash) ───────────────────────────────────
const redisPublisher = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN
});

const redisSubscriber = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN
});

console.log('✅ Redis clients initialized');

// ─── Authentication Middleware ─────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const unitId = socket.handshake.auth.unitId;
    const userId = socket.handshake.auth.userId;

    if (!token || !unitId) {
      return next(new Error('Authentication error: Missing token or unitId'));
    }

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

// ─── Socket.io Connection Handling ────────────────────────────
io.on('connection', (socket) => {
  const { unitId, userId } = socket.data;
  console.log(`🔌 Client connected: ${socket.id} (Unit: ${unitId}, User: ${userId})`);

  const unitRoom = `unit-${unitId}`;
  socket.join(unitRoom);

  socket.emit('connected', {
    socketId: socket.id,
    unitId,
    userId,
    timestamp: new Date().toISOString()
  });

  // ─── CRITICAL: POS Transactions ────────────────────────────────
  socket.on('pos-transaction', (data) => {
    io.to(unitRoom).emit('pos-transaction', { ...data, timestamp: new Date().toISOString() });
    console.log(`🛒 POS Transaction: Unit ${unitId}, Order #${data.orderNumber}`);
  });

  // ─── CRITICAL: Stock Updates ───────────────────────────────────
  socket.on('stock-updated', (data) => {
    io.to(unitRoom).emit('stock-updated', { ...data, timestamp: new Date().toISOString() });
    console.log(`📦 Stock Updated: Unit ${unitId}, Product ${data.productId}`);
  });

  // ─── CRITICAL: Stock Alerts ────────────────────────────────────
  socket.on('stock-alert', (data) => {
    io.to(unitRoom).emit('stock-alert', { ...data, timestamp: new Date().toISOString() });
    console.log(`⚠️ Stock Alert: Unit ${unitId}, ${data.message}`);
  });

  // ─── CRITICAL: CS Ticket Messages ─────────────────────────────
  socket.on('join-ticket', (ticketId) => {
    socket.join(`ticket-${ticketId}`);
    socket.emit('joined-ticket', { ticketId });
    console.log(`🎫 Joined ticket: ${ticketId}`);
  });

  socket.on('leave-ticket', (ticketId) => {
    socket.leave(`ticket-${ticketId}`);
    socket.emit('left-ticket', { ticketId });
    console.log(`🎫 Left ticket: ${ticketId}`);
  });

  socket.on('ticket-message', (data) => {
    const { ticketId, sender } = data;
    io.to(`ticket-${ticketId}`).emit('ticket-message', {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`💬 Ticket Message: Ticket ${ticketId}, Sender ${sender}`);
  });

  // ─── CRITICAL: POS Cash Alerts ────────────────────────────────
  socket.on('pos-cash-alert', (data) => {
    io.to(unitRoom).emit('pos-cash-alert', { ...data, timestamp: new Date().toISOString() });
    console.log(`💰 POS Cash Alert: Unit ${unitId}, Shift #${data.shiftId}`);
  });

  // ─── Notifications ─────────────────────────────────────────────
  socket.on('notification', (data) => {
    io.to(unitRoom).emit('notification', { ...data, timestamp: new Date().toISOString() });
    console.log(`🔔 Notification: Unit ${unitId}`);
  });

  // ─── Order Status Updates ──────────────────────────────────────
  socket.on('order-status-changed', (data) => {
    io.to(unitRoom).emit('order-status-changed', { ...data, timestamp: new Date().toISOString() });
    console.log(`📋 Order Status: Unit ${unitId}, Order #${data.orderId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    console.error(`[Socket Error] ${socket.id}:`, err);
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// ─── HTTP API Routes ───────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size,
    rooms: Array.from(io.sockets.adapter.rooms.keys())
  });
});

app.post('/emit', (req, res) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== SOCKET_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { room, event, data } = req.body;
  if (!room || !event) {
    return res.status(400).json({ error: 'Missing room or event' });
  }

  try {
    io.to(room).emit(event, data);
    console.log(`📡 HTTP API: ${room} -> ${event}`);
    res.json({ success: true, room, event });
  } catch (err) {
    console.error('[HTTP API] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Start Server ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
  console.log(`📡 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🔗 Redis: ${UPSTASH_REDIS_REST_URL}`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});
