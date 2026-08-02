# Testing Checklist - Foundation Analysis

## 📊 **Current Architecture Status**

### **1. Database Layer (MySQL + Drizzle)**
- ✅ Connection pool: 10 connections (reasonable for hundreds of users)
- ✅ Timezone: +07:00 (WIB)
- ✅ Date strings: true (avoids JS Date parsing issues)
- ✅ Keep-alive: enabled
- ⚠️ **Need to check**: Query performance, N+1 issues, index coverage

### **2. Redis Layer (Upstash)**
- ✅ Session storage (24h TTL)
- ✅ Rate limiting (sliding window)
- ✅ Stock alert cooldown
- ✅ Cache invalidation (Inngest)
- ⚠️ **Need to check**: Hit rate, cache effectiveness, pub/sub performance

### **3. Realtime Layer (Socket.io)**
- ✅ Socket.io server running (port 13337)
- ✅ HTTP API for server-to-client (port 13338)
- ✅ Hybrid approach (Socket.io + polling)
- ⚠️ **Need to test**: Connection stability, event delivery, fallback mechanism

### **4. Background Jobs (Inngest)**
- ✅ Redis cache cleaner
- ✅ Stock alert checker
- ⚠️ **Need to test**: Job execution, retry logic, performance

---

## 🧪 **Critical Testing Areas**

### **Priority 1: Database Performance**

#### **Test 1.1: Check for N+1 Query Issues**
```javascript
// File: src/routes/(app)/finance/[slug]/+page.server.js
// Look for patterns like:
const units = await db.select()...
for (const unit of units) {
  const employees = await db.select()... // ❌ N+1
}

// Should be:
const unitsWithEmployees = await db.select()...
  .leftJoin(employees, eq(units.id, employees.unitId))
```

**Files to check:**
- `src/routes/(app)/finance/[slug]/+page.server.js`
- `src/routes/portal/[login_slug]/dashboard/+page.server.js`
- `src/routes/api/updates/+server.js`

#### **Test 1.2: Verify Database Indexes**
```sql
-- Check existing indexes
SHOW INDEX FROM products;
SHOW INDEX FROM transaksi;
SHOW INDEX FROM employees;
SHOW INDEX FROM unit_bisnis;

-- Add missing indexes if needed:
CREATE INDEX idx_products_unit ON products(unit_id);
CREATE INDEX idx_transaksi_date ON transaksi(created_at);
CREATE INDEX idx_transaksi_kategori ON transaksi(kategori_trx);
```

#### **Test 1.3: Monitor Query Performance**
```javascript
// Add query logging to drizzle.js
export const db = drizzle(pool, { 
    schema: { ...schema, ...relations },
    mode: "default",
    logger: true // Enable for testing
});
```

---

### **Priority 2: Redis Performance**

#### **Test 2.1: Check Redis Hit Rate**
```javascript
// Add monitoring to redis.js
export const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
        enableAutoPipelining: true, // Enable for better performance
    })
    : null;
```

#### **Test 2.2: Test Session Management**
```javascript
// Test session creation and retrieval
const token = await createSession(userId);
const retrievedUserId = await getUserIdFromSession(token);
console.assert(retrievedUserId === userId, 'Session test failed');
```

#### **Test 2.3: Test Rate Limiting**
```javascript
// Test rate limit enforcement
for (let i = 0; i < 15; i++) {
  const result = await checkRateLimit({ key: 'test', prefix: 'login', limit: 10, windowSec: 60 });
  console.log(`Request ${i}: allowed=${result.allowed}, remaining=${result.remaining}`);
}
```

---

### **Priority 3: Socket.io Realtime**

#### **Test 3.1: Test Connection Stability**
```javascript
// In browser console:
const socket = io('http://localhost:13337');
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('error', (err) => console.error('Error:', err));
```

#### **Test 3.2: Test Event Delivery**
```javascript
// Test critical events:
socket.emit('pos-transaction', { orderNumber: 'TEST-001', customerName: 'Test' });
socket.on('pos-transaction', (data) => console.log('Received:', data));
```

#### **Test 3.3: Test Polling Fallback**
```javascript
// Stop Socket.io server and verify polling kicks in
// Check browser console for: "[Realtime] Using Polling for all events"
```

---

### **Priority 4: Error Handling**

#### **Test 4.1: Test Database Connection Failure**
```javascript
// Stop MySQL and verify graceful degradation
// Should see error logs but app shouldn't crash
```

#### **Test 4.2: Test Redis Failure**
```javascript
// Stop Upstash and verify memory fallback works
// Session should still work via memorySessions Map
```

#### **Test 4.3: Test Socket.io Failure**
```javascript
// Stop Socket.io server and verify polling fallback
// App should still function with 60s polling
```

---

## 📈 **Performance Benchmarks**

### **Target Metrics:**
- Database query: < 100ms (95th percentile)
- Redis operations: < 10ms
- Socket.io latency: < 50ms
- API response: < 200ms
- Page load: < 2s

### **Current Status:**
- ❌ Database: Not measured
- ❌ Redis: Not measured
- ❌ Socket.io: Not measured
- ❌ API: Not measured
- ❌ Page load: Not measured

---

## 🎯 **Action Plan**

### **Phase 1: Immediate (Today)**
1. ✅ Enable query logging in drizzle.js
2. ✅ Test Socket.io connection from browser
3. ✅ Test session management
4. ✅ Check for N+1 queries in critical files

### **Phase 2: Short-term (This Week)**
1. ⏸️ Add missing database indexes
2. ⏸️ Implement query performance monitoring
3. ⏸️ Test Redis hit rate
4. ⏸️ Add error handling tests

### **Phase 3: Long-term (Next Sprint)**
1. ⏸️ Implement caching layer
2. ⏸️ Add performance monitoring dashboard
3. ⏸️ Load testing with hundreds of users
4. ⏸️ Optimize based on metrics

---

## 🔍 **Specific Issues Found**

### **Issue 1: Missing Indexes**
```sql
-- Likely missing indexes:
CREATE INDEX idx_products_unit ON products(unit_id);
CREATE INDEX idx_transaksi_unit ON transaksi(unit_id);
CREATE INDEX idx_transaksi_date ON transaksi(created_at);
CREATE INDEX idx_employees_unit ON employees(unit_id);
```

### **Issue 2: Potential N+1 Queries**
Files to review:
- `src/routes/api/updates/+server.js` - Multiple sequential queries
- `src/routes/portal/[login_slug]/dashboard/+page.server.js` - Employees + transactions

### **Issue 3: No Query Logging**
```javascript
// drizzle.js has logger: false
// Should enable for testing: logger: true
```

### **Issue 4: No Performance Monitoring**
Need to add:
- Query time logging
- Redis hit rate tracking
- Socket.io connection monitoring
- API response time tracking

---

## ✅ **Quick Wins (Implement Now)**

### **1. Enable Query Logging**
```javascript
// src/lib/server/drizzle.js
export const db = drizzle(pool, { 
    schema: { ...schema, ...relations },
    mode: "default",
    logger: true // Change from false to true
});
```

### **2. Add Critical Indexes**
```sql
-- Run in MySQL:
CREATE INDEX idx_products_unit ON products(unit_id);
CREATE INDEX idx_transaksi_unit_date ON transaksi(unit_id, created_at);
CREATE INDEX idx_employees_unit ON employees(unit_id);
```

### **3. Test Socket.io Connection**
Open browser console and run:
```javascript
fetch('http://localhost:13338/health').then(r => r.json()).then(console.log);
```

### **4. Monitor Redis Usage**
```javascript
// Add to redis.js:
export const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
        enableAutoPipelining: true,
    })
    : null;
```

---

## 📊 **Cost Optimization Check**

### **Current Usage:**
- Upstash Redis: Free tier (10k commands/day)
- Inngest: Free tier (50k events/month)
- Database: Local MySQL (no cost)
- Socket.io: Self-hosted (no cost)

### **Optimization Opportunities:**
1. ✅ Already using free tiers where possible
2. ✅ Self-hosted Socket.io (no per-message cost)
3. ⚠️ Need to monitor Upstash usage to stay within free tier
4. ⚠️ Need to implement Inngest event batching

---

## 🎯 **Conclusion**

**Foundation Status: 7/10**

**Strengths:**
- ✅ Good connection pool configuration
- ✅ Redis used for critical operations
- ✅ Socket.io implemented correctly
- ✅ Error handling in place

**Weaknesses:**
- ❌ No performance monitoring
- ❌ Missing database indexes
- ❌ Potential N+1 queries
- ❌ No query logging enabled

**Recommendation:** Implement quick wins first, then add monitoring before proceeding with new features.
