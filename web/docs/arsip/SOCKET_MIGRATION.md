# Socket.io Migration Guide

## Overview
This document describes the migration from Pusher to Socket.io for realtime functionality in the Upstyle platform.

## Architecture Changes

### Before (Pusher)
- All events via Pusher cloud service
- Per-message pricing
- Multiple channels per module
- No fallback mechanism

### After (Socket.io + Polling)
- **Critical events**: Socket.io (self-hosted, WebSocket)
- **Non-critical events**: Polling (60s intervals)
- Hybrid approach for optimal performance
- Redis adapter for horizontal scaling
- Cost-effective (flat server cost)

## Critical Events (Socket.io)
- `pos-transaction` - POS transactions
- `stock-updated` - Stock updates
- `stock-alert` - Stock alerts
- `ticket-message` - CS ticket messages
- `pos-cash-alert` - POS cash discrepancies
- `notification` - System notifications
- `order-status-changed` - Order status updates

## Non-Critical Events (Polling)
- Finance stats updates
- Marketing campaigns
- Sales pipeline updates
- Report notifications

## File Changes

### New Files
- `socket-server/index.js` - Socket.io server with Redis adapter
- `src/lib/socket.js` - Socket.io client library
- `src/lib/server/socketTrigger.js` - Server-side event trigger
- `.env.example` - Updated environment variables

### Modified Files
- `package.json` - Added Socket.io dependencies, removed Pusher
- `src/lib/realtimeStore.js` - Refactored to use Socket.io
- `src/lib/polling.js` - Optimized for non-critical events
- `src/lib/pusher.js` - Deprecated (backward compatibility)
- `src/lib/server/pusher.js` - Deprecated (backward compatibility)
- `README.md` - Updated documentation

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Add these to your `.env` file:
```env
PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_SERVER_URL=http://localhost:3001
SOCKET_PORT=3001
SOCKET_API_PORT=3002
SOCKET_API_KEY=your-socket-api-key-change-in-production
```

### 3. Start Socket.io Server
```bash
npm run socket-server
```

### 4. Start Development Server
```bash
npm run dev
```

## Code Migration Examples

### Before (Pusher)
```javascript
import { triggerEvent } from '$lib/server/pusher';

// Trigger event
await triggerEvent('private-unit-123', 'stock-updated', data);
```

### After (Socket.io)
```javascript
import { socketTriggers } from '$lib/server/socketTrigger';

// Trigger event (same API, different backend)
await socketTriggers.stockUpdated(123, data);
```

### Client-side
```javascript
// Before
import { getPusherClient } from '$lib/pusher';
const pusher = getPusherClient();

// After
import { getSocketClient } from '$lib/socket';
const socket = await getSocketClient({ token, unitId, userId });
```

## Deployment

### Production Setup
1. Deploy Socket.io server to VPS (can be same or different server)
2. Use PM2 for process management:
```bash
pm2 start socket-server/index.js --name "socket-server"
```
3. Configure nginx reverse proxy for WebSocket:
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

### Scaling
- Use Redis adapter for horizontal scaling
- Multiple Socket.io servers can share state via Redis
- Load balancer can distribute WebSocket connections

## Cost Comparison

### Pusher (Before)
- $50-100/month for 100 active users
- Per-message pricing
- Scales linearly with usage

### Socket.io (After)
- $5-10/month (VPS cost)
- Flat pricing regardless of usage
- More predictable costs

## Performance Improvements

- **Lower latency**: Direct WebSocket connection (<100ms vs <50ms)
- **Reduced server load**: Polling only for non-critical events
- **Better scalability**: Redis adapter for horizontal scaling
- **Cost-effective**: No per-message fees

## Troubleshooting

### Socket.io connection fails
1. Check Socket.io server is running: `curl http://localhost:3002/health`
2. Verify environment variables are set correctly
3. Check firewall allows WebSocket connections

### Events not received
1. Verify room naming: `unit-{unitId}` format
2. Check Redis connection for pub/sub
3. Review event handler registration in `realtimeStore.js`

### Polling not working
1. Check `/api/updates` endpoint exists
2. Verify polling interval configuration
3. Review browser console for errors

## Rollback Plan

If issues arise, you can rollback by:
1. Revert `package.json` dependencies
2. Restore original `realtimeStore.js`
3. Re-enable Pusher environment variables
4. Restart servers

## Monitoring

### Socket.io Server Health
```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "connectedClients": 10,
  "rooms": ["unit-1", "unit-2", "ticket-123"]
}
```

### Performance Metrics
- Monitor WebSocket connection count
- Track event delivery latency
- Monitor Redis pub/sub throughput
- Track polling API response times
