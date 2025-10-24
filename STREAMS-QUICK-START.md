# 🌊 Redis Streams - Quick Start

## Kiến trúc này là gì?

**Redis Streams + Pub/Sub** = Perfect combination!

```
SERVICE ──(Streams)──> SERVER ──(Pub/Sub)──> SERVICE
        Heavy Data             Commands

✅ Streams: Service gửi nhiều data → Server write vào DB
✅ Pub/Sub: Server gửi commands → Service execute
```

---

## 🚀 Chạy ngay (2 terminals)

### Terminal 1: Server

```bash
docker-compose up -d redis
yarn stream:server
```

### Terminal 2: Crawler Service

```bash
yarn stream:crawler
```

---

## 📊 Bạn sẽ thấy gì?

### Server Terminal:

```
🏢 STREAM SERVER STARTING
  - Redis Streams: Service → Server
  - Redis Pub/Sub: Server → Service

✅ Created consumer group for stream:tokens
✅ Created consumer group for stream:transactions
✅ Created consumer group for stream:crawler-events

👂 Listening to stream:tokens...
👂 Listening to stream:transactions...
👂 Listening to stream:crawler-events...

📥 [STREAM:TOKENS] Message: 1234567890-0
   From: crawler
   Type: TOKEN_CREATED
   Token: Bitcoin (BTC)
   ⚙️  Saving token to database...
   ✅ Token saved to database
   ✓ ACK message 1234567890-0
   📢 Published to channel:token:created

📥 [STREAM:TRANSACTIONS] Batch: 3 txs
   ⚙️  Batch inserting transactions...
   ✅ 3 transactions saved
   ✓ ACK 3 messages
```

### Crawler Service Terminal:

```
🤖 CRAWLER SERVICE STARTING
  - Redis Streams: Send data to Server
  - Redis Pub/Sub: Receive commands from Server

👂 Listening to server commands via Pub/Sub...

🔍 Crawling token: 0xabc123...
   ✅ Token crawled: Bitcoin (BTC)
   📤 [STREAM] Token sent: 1234567890-0
      Stream: stream:tokens
      Type: TOKEN_CREATED

💸 Crawling transactions for: 0xabc123...
   ✅ Found 3 transactions
   📤 [STREAM] Sending 3 transactions...
   ✅ 3 transactions sent to stream

📥 [PUB/SUB] Command from Server:
   Command: START_CRAWLING
   Data: { tokenAddress: '0xabc...' }
   ▶️  Resuming crawling...

📥 [PUB/SUB] Token created notification: {
  address: '0xabc...',
  name: 'Bitcoin'
}
```

---

## 🎯 Tại sao dùng Streams?

### ❌ Trước đây (Queue):

```
Service ─(Queue)─> Server

Problems:
- Message bị mất nếu server crash trước khi process
- Không có history
- Khó scale (1 message chỉ 1 consumer)
```

### ✅ Bây giờ (Streams):

```
Service ─(Streams)─> Server

Benefits:
✅ Messages persist (không mất khi restart)
✅ Consumer groups (nhiều servers cùng process)
✅ Message history (có thể replay)
✅ ACK mechanism (guarantee processing)
✅ Perfect cho write heavy data vào DB
```

---

## 💻 Code tóm tắt

### Service gửi data (Streams):

```typescript
// Service
await redis.xAdd("stream:tokens", "*", {
  serviceId: "crawler",
  type: "TOKEN_CREATED",
  data: JSON.stringify(tokenData),
});

// ✅ Data persist trong Redis
// ✅ Server sẽ process khi sẵn sàng
// ✅ Không bị mất nếu service crash
```

### Server nhận data (Streams):

```typescript
// Server
const messages = await redis.xReadGroup(
  "server-group", // Consumer group
  "server-1", // Consumer name
  [{ key: "stream:tokens", id: ">" }],
  { COUNT: 10, BLOCK: 5000 }
);

// Process messages
for (const msg of messages) {
  await saveToDatabase(msg);
  await redis.xAck("stream:tokens", "server-group", msg.id);
}

// ✅ Batch processing (nhanh hơn)
// ✅ ACK sau khi save (guarantee)
// ✅ Nếu crash, message sẽ retry
```

### Server gửi command (Pub/Sub):

```typescript
// Server
await redis.publish(
  "channel:service:crawler:commands",
  JSON.stringify({
    command: "START_CRAWLING",
    data: { tokenAddress: "0xabc..." },
  })
);

// ✅ Instant delivery
// ✅ Lightweight
```

### Service nhận command (Pub/Sub):

```typescript
// Service
await subscriber.subscribe("channel:service:crawler:commands", (message) => {
  const cmd = JSON.parse(message);
  if (cmd.command === "START_CRAWLING") {
    startCrawling(cmd.data);
  }
});

// ✅ Real-time
// ✅ Non-blocking
```

---

## 📋 3 Streams chính

### 1. stream:tokens

**Mục đích:** Token data từ crawler
**Volume:** Medium (hàng trăm/phút)
**Batch size:** 10 messages
**Processing:** Save to DB + Cache

### 2. stream:transactions

**Mục đích:** Transaction data từ crawler
**Volume:** High (hàng ngàn/phút)
**Batch size:** 50 messages
**Processing:** Batch insert to DB

### 3. stream:crawler-events

**Mục đích:** Crawler status, errors, heartbeat
**Volume:** Low (vài messages/phút)
**Batch size:** 10 messages
**Processing:** Update status + Logging

---

## 🔧 Monitoring

### Check stream length:

```bash
redis-cli XLEN stream:tokens
# Output: 1234 messages
```

### Check pending messages:

```bash
redis-cli XPENDING stream:tokens server-group
# Xem messages đang chờ được process
```

### View recent messages:

```bash
redis-cli XRANGE stream:tokens - + COUNT 10
# Xem 10 messages gần nhất
```

### Monitor real-time:

```bash
redis-cli MONITOR
# Xem tất cả commands real-time
```

---

## 🎯 Use Cases

### ✅ Khi nào dùng Streams?

1. **Service gửi nhiều data về Server**

   - Token data
   - Transaction data
   - Log data
   - Metrics data

2. **Cần guarantee delivery**

   - Không được mất data
   - Phải process tất cả messages

3. **Write heavy vào database**

   - Batch processing
   - Multiple servers process

4. **Cần replay messages**
   - Debugging
   - Reprocessing
   - Analytics

### ✅ Khi nào dùng Pub/Sub?

1. **Server gửi commands đến Services**

   - Start/Stop/Pause
   - Configuration updates
   - Trigger actions

2. **Real-time notifications**

   - Token created
   - System alerts
   - Status updates

3. **Broadcast to many services**
   - All services nhận cùng message

---

## ⚡ Performance

### Streams:

- **Throughput:** 10k-20k messages/second
- **Latency:** ~1-5ms per message
- **Storage:** Persisted in Redis memory

### Pub/Sub:

- **Throughput:** 50k+ messages/second
- **Latency:** <1ms
- **Storage:** No storage (fire-and-forget)

---

## 🐛 Troubleshooting

### Messages không được process?

```bash
# Check server đang chạy?
ps aux | grep stream-server

# Check stream có messages?
redis-cli XLEN stream:tokens

# Check pending messages?
redis-cli XPENDING stream:tokens server-group
```

### Service không nhận commands?

```bash
# Check service đang chạy?
ps aux | grep stream-crawler

# Check có subscribe channels?
redis-cli PUBSUB CHANNELS
```

### Memory quá cao?

```bash
# Trim streams
redis-cli XTRIM stream:tokens MAXLEN ~ 10000
```

---

## 📚 Tài liệu đầy đủ

**REDIS-STREAMS-GUIDE.md** ← Đọc chi tiết:

- Architecture deep dive
- Code examples đầy đủ
- Best practices
- Monitoring & troubleshooting

---

## 🎉 Summary

**Perfect Architecture cho high-volume data:**

```
┌─────────────┐                        ┌─────────────┐
│   SERVICE   │                        │   SERVER    │
│             │                        │             │
│  Crawl data │──(Streams)──> Write   │  Save to DB │
│             │    Many data   to DB   │             │
│             │                        │             │
│  Listen cmd │<──(Pub/Sub)── Send    │  Control    │
│  Execute    │    Lightweight cmd     │  Services   │
└─────────────┘                        └─────────────┘
```

**Chạy thử ngay:**

```bash
yarn stream:server    # Terminal 1
yarn stream:crawler   # Terminal 2
```

🚀 **Enjoy the power of Redis Streams!**
