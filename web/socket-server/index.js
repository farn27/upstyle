import { Server } from 'socket.io';
import { Redis } from '@upstash/redis';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { createHmac, timingSafeEqual } from 'crypto';

dotenv.config();

const PORT = process.env.PORT || 3000;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY;

if (!SOCKET_API_KEY || SOCKET_API_KEY.length < 32) {
  console.error('❌ SOCKET_API_KEY wajib diisi (minimal 32 karakter)');
  process.exit(1);
}

const SOCKET_API_KEY_BUF = Buffer.from(SOCKET_API_KEY);

function isValidApiKey(candidate) {
  if (typeof candidate !== 'string') return false;
  const candidateBuf = Buffer.from(candidate);
  if (candidateBuf.length !== SOCKET_API_KEY_BUF.length) return false;
  return timingSafeEqual(candidateBuf, SOCKET_API_KEY_BUF);
}

// Kunci token socket = turunan SOCKET_API_KEY (harus sama dengan web: lib/server/socketToken.js)
const SOCKET_TOKEN_KEY = createHmac('sha256', SOCKET_API_KEY).update('bizgrow-socket-token-v1').digest();

/** Verifikasi token dari web. Return payload { sub, unitId, exp } atau null. */
function verifySocketToken(token) {
  if (typeof token !== 'string') return null;
  const [payloadB64, signatureB64] = token.split('.');
  if (!payloadB64 || !signatureB64) return null;

  const expected = createHmac('sha256', SOCKET_TOKEN_KEY).update(payloadB64).digest();
  const signature = Buffer.from(signatureB64, 'base64url');
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!Number.isInteger(payload.unitId) || payload.unitId <= 0) return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const app = express();
// Origin yang boleh connect (pisahkan dengan koma), mis.
// ORIGIN=https://bizgrows-ten.vercel.app,http://localhost:5173
const ALLOWED_ORIGINS = (process.env.ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  console.error('❌ ORIGIN wajib diisi (mis. https://bizgrows-ten.vercel.app)');
  process.exit(1);
}

// localhost = app desktop Tauri (port dinamis 4173+) & mode dev — website internet tidak bisa memakai origin ini
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Tanpa header Origin = bukan browser (server web / app mobile) → tetap wajib token
const isAllowedOrigin = (origin) =>
  !origin || ALLOWED_ORIGINS.includes(origin) || LOCALHOST_ORIGIN.test(origin);

app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), credentials: true }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    methods: ['GET', 'POST'],
    credentials: true
  },
  // CORS browser tidak berlaku untuk WebSocket → cek Origin manual di handshake
  allowRequest: (req, cb) => cb(null, isAllowedOrigin(req.headers.origin)),
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const redisPublisher = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN
});

console.log('✅ Redis clients initialized');

// unitId diambil dari token yang ditandatangani web, BUKAN dari kiriman client
io.use((socket, next) => {
  const payload = verifySocketToken(socket.handshake.auth?.token);
  if (!payload) {
    return next(new Error('Authentication error'));
  }
  socket.data.unitId = payload.unitId;
  socket.data.userId = payload.sub;
  next();
});

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

  socket.on('pos-transaction', (data) => {
    io.to(unitRoom).emit('pos-transaction', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('stock-updated', (data) => {
    io.to(unitRoom).emit('stock-updated', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('stock-alert', (data) => {
    io.to(unitRoom).emit('stock-alert', { ...data, timestamp: new Date().toISOString() });
  });

  // Room tiket di-scope per unit: user unit lain otomatis masuk room berbeda
  const ticketRoom = (ticketId) => {
    const id = Number(ticketId);
    return Number.isInteger(id) && id > 0 ? `${unitRoom}:ticket-${id}` : null;
  };

  socket.on('join-ticket', (ticketId) => {
    const room = ticketRoom(ticketId);
    if (!room) return;
    socket.join(room);
    socket.emit('joined-ticket', { ticketId: Number(ticketId) });
  });

  socket.on('leave-ticket', (ticketId) => {
    const room = ticketRoom(ticketId);
    if (!room) return;
    socket.leave(room);
    socket.emit('left-ticket', { ticketId: Number(ticketId) });
  });

  socket.on('ticket-message', (data) => {
    const room = ticketRoom(data?.ticketId);
    if (!room) return;
    io.to(room).emit('ticket-message', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('pos-cash-alert', (data) => {
    io.to(unitRoom).emit('pos-cash-alert', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('notification', (data) => {
    io.to(unitRoom).emit('notification', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('order-status-changed', (data) => {
    io.to(unitRoom).emit('order-status-changed', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size
  });
});

app.post('/emit', (req, res) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { room, event, data } = req.body;
  if (!room || !event) {
    return res.status(400).json({ error: 'Missing room or event' });
  }

  io.to(room).emit(event, data);
  res.json({ success: true, room, event });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
  console.log(`🔒 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
