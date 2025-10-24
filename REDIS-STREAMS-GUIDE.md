# 🌊 Redis Streams + Pub/Sub Architecture

## 🎯 Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SERVICE → SERVER: Redis Streams (Heavy Data)               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                    │
│  ✅ Persist data (không mất khi restart)                    │
│  ✅ Consumer groups (multiple servers xử lý)                │
│  ✅ Automatic ACK                                            │
│  ✅ Perfect cho write heavy data vào DB                     │
│                                                              │
│  SERVER → SERVICE: Redis Pub/Sub (Commands)                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                 │
│  ✅ Lightweight                                              │
│  ✅ Real-time                                                │
│  ✅ Broadcast đến nhiều services                            │
│  ✅ Perfect cho commands/notifications                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

### Flow 1: Service gửi data → Server (Streams)

```
┌──────────────┐                      ┌──────────────┐
│   SERVICE    │                      │    SERVER    │
│  (Crawler)   │                      │              │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       │ 1. XADD (Add to stream)            │
       │    stream:tokens                   │
       │─────────────────────────────────────────>
       │                                     │
       │                                2. XREADGROUP
       │                                  (Consumer group)
       │                                     │
       │                                3. Process data
       │                                  - Save to DB
       │                                  - Cache
       │                                     │
       │                                4. XACK
       │                                  (Acknowledge)
       │                                     │
```

**Characteristics:**

- **Persisted**: Data lưu trong Redis, không mất khi restart
- **Guaranteed delivery**: Message không bị mất
- **At-least-once**: Message có thể được process nhiều lần
- **Consumer groups**: Multiple servers có thể process cùng stream

---

### Flow 2: Server gửi commands → Service (Pub/Sub)

```
┌──────────────┐                      ┌──────────────┐
│    SERVER    │                      │   SERVICE    │
│              │                      │  (Crawler)   │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       │ 1. PUBLISH                          │
       │    channel:service:crawler:commands │
       │<────────────────────────────────────│
       │                                     │
       │                                2. SUBSCRIBE
       │                                  (Listen)
       │                                     │
       │                                3. Execute
       │                                  command
       │                                     │
```

**Characteristics:**

- **Fire-and-forget**: Không guarantee delivery
- **Real-time**: Instant delivery
- **Lightweight**: Không lưu lại
- **Broadcast**: Tất cả subscribers nhận

---

## 🚀 Quick Start

### 1. Start Redis

```bash
docker-compose up -d redis
```

### 2. Start Server (Terminal 1)

```bash
yarn stream:server
```

### 3. Start Crawler Service (Terminal 2)

```bash
yarn stream:crawler
```

---

## 💻 Code Examples

### Service → Server: Send Token Data (Streams)

```typescript
// Crawler Service
async sendTokenData(tokenData: any) {
  // XADD: Add to stream
  const messageId = await redis.xAdd(
    "stream:tokens",    // Stream name
    "*",                // Auto-generate ID
    {
      serviceId: "crawler",
      type: "TOKEN_CREATED",
      data: JSON.stringify(tokenData),
      timestamp: new Date().toISOString(),
    },
    {
      TRIM: {
        strategy: "MAXLEN",
        strategyModifier: "~",
        threshold: 10000,  // Keep max 10k messages
      },
    }
  );

  console.log(`✅ Token sent: ${messageId}`);
}
```

### Server: Consume Token Data (Streams)

```typescript
// Server
async consumeTokenStream() {
  while (true) {
    // XREADGROUP: Read from stream with consumer group
    const messages = await redis.xReadGroup(
      "server-group",      // Consumer group
      "server-1",          // Consumer name
      [
        {
          key: "stream:tokens",
          id: ">",           // Only new messages
        },
      ],
      {
        COUNT: 10,          // Batch size
        BLOCK: 5000,        // Wait timeout (ms)
      }
    );

    if (messages && messages.length > 0) {
      for (const stream of messages) {
        for (const message of stream.messages) {
          // Process message
          await processToken(message);

          // ACK message (confirm processed)
          await redis.xAck(
            "stream:tokens",
            "server-group",
            message.id
          );
        }
      }
    }
  }
}
```

### Server → Service: Send Command (Pub/Sub)

```typescript
// Server
async sendCommand(serviceId: string, command: string, data: any) {
  await redis.publish(
    `channel:service:${serviceId}:commands`,
    JSON.stringify({
      command,
      data,
      timestamp: new Date().toISOString(),
    })
  );

  console.log(`✅ Command sent: ${command}`);
}

// Example
await sendCommand("crawler", "START_CRAWLING", {
  tokenAddress: "0xabc123...",
});
```

### Service: Listen to Commands (Pub/Sub)

```typescript
// Crawler Service
async listenToCommands() {
  await subscriber.subscribe(
    "channel:service:crawler:commands",
    (message: string) => {
      const cmd = JSON.parse(message);

      switch (cmd.command) {
        case "START_CRAWLING":
          this.startCrawling(cmd.data);
          break;
        case "PAUSE":
          this.pause();
          break;
        case "STOP":
          this.stop();
          break;
      }
    }
  );
}
```

---

## 🌊 Redis Streams Deep Dive

### Streams vs Queues vs Pub/Sub

| Feature                 | Streams              | Queues    | Pub/Sub                 |
| ----------------------- | -------------------- | --------- | ----------------------- |
| **Persistence**         | ✅ Yes               | ✅ Yes    | ❌ No                   |
| **Consumer Groups**     | ✅ Yes               | ✅ Yes    | ❌ No                   |
| **Message History**     | ✅ Yes               | ❌ No     | ❌ No                   |
| **Guaranteed Delivery** | ✅ Yes               | ✅ Yes    | ❌ No                   |
| **Broadcast**           | ❌ No                | ❌ No     | ✅ Yes                  |
| **Speed**               | Fast                 | Fast      | Fastest                 |
| **Use Case**            | Event sourcing, logs | Job queue | Real-time notifications |

### Stream Structure

```
stream:tokens
├─ 1234567890-0  ← Message ID (timestamp-sequence)
│  ├─ serviceId: "crawler"
│  ├─ type: "TOKEN_CREATED"
│  ├─ data: "{...json...}"
│  └─ timestamp: "2024-01-01T10:00:00Z"
├─ 1234567891-0
│  ├─ serviceId: "crawler"
│  └─ ...
└─ 1234567892-0
   └─ ...
```

### Consumer Groups

```
Stream: stream:tokens
├─ Consumer Group: server-group
│  ├─ Consumer: server-1 (processing messages 1-10)
│  └─ Consumer: server-2 (processing messages 11-20)
└─ Consumer Group: analytics-group
   └─ Consumer: analytics-1 (processing all messages)
```

**Benefits:**

- Multiple servers process different messages (load balancing)
- If server-1 crashes, server-2 can take over pending messages
- Different groups can process same stream for different purposes

### Message States

```
┌──────────────┐
│  NEW         │ ← Message just added to stream
└──────┬───────┘
       │
       │ XREADGROUP (read)
       v
┌──────────────┐
│  PENDING     │ ← Message delivered but not ACKed
└──────┬───────┘
       │
       │ XACK (acknowledge)
       v
┌──────────────┐
│  ACKNOWLEDGED│ ← Message processed successfully
└──────────────┘
```

---

## 📋 Stream Types

### 1. stream:tokens

**Purpose:** Token data từ crawler services

**Message Format:**

```json
{
  "serviceId": "crawler",
  "type": "TOKEN_CREATED" | "TOKEN_UPDATED",
  "data": {
    "id": "token-123",
    "address": "0xabc...",
    "name": "Bitcoin",
    "symbol": "BTC",
    "decimals": 18,
    "totalSupply": "21000000",
    "chain": "ethereum"
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

**Processing:**

- Server reads in batches (10 messages)
- Saves to database
- ACKs messages
- Broadcasts notification via Pub/Sub

---

### 2. stream:transactions

**Purpose:** Transaction data từ crawler services

**Message Format:**

```json
{
  "serviceId": "crawler",
  "type": "TRANSACTION_CREATED",
  "data": {
    "id": "tx-123",
    "hash": "0xdef...",
    "from": "0x123...",
    "to": "0x456...",
    "value": "1000000",
    "blockHash": "0x789..."
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

**Processing:**

- Server reads in large batches (50 messages)
- Batch inserts vào database
- ACKs all messages

**Why batch?**

- Transactions volume cao
- Batch insert nhanh hơn
- Reduce database connections

---

### 3. stream:crawler-events

**Purpose:** Crawler status, errors, metrics

**Message Format:**

```json
{
  "serviceId": "crawler",
  "type": "CRAWLER_ONLINE" | "CRAWLER_OFFLINE" | "HEARTBEAT" | "CRAWLER_ERROR",
  "data": {
    "crawlerId": "crawler-1",
    "status": "active",
    "error": "..." // if error
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

**Processing:**

- Update crawler status in DB
- Log events
- Send alerts nếu error

---

## 📡 Pub/Sub Channels

### 1. channel:service:{serviceId}:commands

**Purpose:** Server gửi commands đến specific service

**Message Format:**

```json
{
  "command": "START_CRAWLING" | "PAUSE" | "STOP" | "CRAWL_TOKEN",
  "data": {
    "tokenAddress": "0xabc..."
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

**Examples:**

```typescript
// Start crawling
channel:service:crawler:commands → START_CRAWLING

// Pause service
channel:service:crawler:commands → PAUSE

// Crawl specific token
channel:service:crawler:commands → CRAWL_TOKEN
```

---

### 2. channel:token:created

**Purpose:** Broadcast khi có token mới

**Message Format:**

```json
{
  "timestamp": "2024-01-01T10:00:00Z",
  "data": {
    "address": "0xabc...",
    "name": "Bitcoin",
    "symbol": "BTC"
  }
}
```

**Subscribers:**

- Analytics service
- Monitor service
- Notification service

---

## ⚙️ Configuration

### Stream Settings

```typescript
// MAXLEN: Giới hạn stream size
{
  TRIM: {
    strategy: "MAXLEN",
    strategyModifier: "~",  // Approximate (faster)
    threshold: 10000,       // Keep max 10k messages
  }
}
```

**Why MAXLEN?**

- Tránh memory leak
- Stream không grow indefinitely
- "~" = approximate trimming (không chính xác 100% nhưng nhanh hơn)

### Consumer Group Settings

```typescript
// Read batch size
COUNT: 10,          // Read 10 messages at a time

// Block timeout
BLOCK: 5000,        // Wait 5 seconds for new messages

// Start from
id: ">",           // Only new messages
id: "0",           // All messages from beginning
id: "1234567890-0" // From specific message
```

---

## 🔧 Monitoring

### Check Stream Length

```bash
redis-cli XLEN stream:tokens
# Output: 1234
```

### Check Pending Messages

```bash
redis-cli XPENDING stream:tokens server-group
# Output:
# 1) "10"          # Pending count
# 2) "1234567890-0" # Min pending ID
# 3) "1234567899-0" # Max pending ID
```

### Check Consumer Group Info

```bash
redis-cli XINFO GROUPS stream:tokens
```

### Check Consumers in Group

```bash
redis-cli XINFO CONSUMERS stream:tokens server-group
```

### View Stream Messages

```bash
# Latest 10 messages
redis-cli XRANGE stream:tokens - + COUNT 10

# All messages
redis-cli XRANGE stream:tokens - +
```

---

## 🎯 Best Practices

### 1. Stream Naming

```
✅ stream:tokens
✅ stream:transactions
✅ stream:crawler-events

❌ tokens
❌ token_stream
```

### 2. Message ID

```typescript
// Auto-generate (recommended)
await redis.xAdd("stream:tokens", "*", {...});

// Manual (only if you need specific ordering)
await redis.xAdd("stream:tokens", "1234567890-0", {...});
```

### 3. Consumer Group Names

```
✅ server-group
✅ analytics-group
✅ monitor-group

❌ group1
❌ consumer
```

### 4. ACK Strategy

```typescript
// ✅ ACK after successful processing
try {
  await saveToDatabase(message);
  await redis.xAck(stream, group, messageId);
} catch (error) {
  // ❌ Don't ACK if error → will be retried
  console.error("Error processing:", error);
}
```

### 5. Batch Processing

```typescript
// ✅ For high volume streams (transactions)
const messages = await redis.xReadGroup(..., { COUNT: 50 });
await batchInsert(messages);

// ✅ For low volume streams (tokens)
const messages = await redis.xReadGroup(..., { COUNT: 10 });
```

### 6. Error Handling

```typescript
// ✅ Handle consumer group already exists
try {
  await redis.xGroupCreate(stream, group, "0", { MKSTREAM: true });
} catch (error) {
  if (error.message.includes("BUSYGROUP")) {
    console.log("Group already exists");
  } else {
    throw error;
  }
}
```

---

## 🐛 Troubleshooting

### Problem: Messages không được process

**Check 1:** Consumer group exists?

```bash
redis-cli XINFO GROUPS stream:tokens
```

**Check 2:** Server đang chạy?

```bash
ps aux | grep stream-server
```

**Check 3:** Pending messages?

```bash
redis-cli XPENDING stream:tokens server-group
```

**Fix:** Claim pending messages

```bash
redis-cli XCLAIM stream:tokens server-group server-1 3600000 <message-id>
```

---

### Problem: Stream memory quá lớn

**Check:**

```bash
redis-cli XLEN stream:tokens
# Output: 1000000 (quá nhiều!)
```

**Fix:** Trim stream

```bash
redis-cli XTRIM stream:tokens MAXLEN ~ 10000
```

---

### Problem: Service không nhận commands

**Check:** Subscribe đúng channel?

```bash
redis-cli PUBSUB CHANNELS
```

**Fix:** Check channel name trong code

---

## 📊 Performance

### Streams Performance

| Operation              | Time   | Throughput |
| ---------------------- | ------ | ---------- |
| XADD                   | ~0.1ms | 10k/sec    |
| XREADGROUP (batch 10)  | ~1ms   | 10k/sec    |
| XREADGROUP (batch 100) | ~5ms   | 20k/sec    |
| XACK                   | ~0.1ms | 10k/sec    |

### Pub/Sub Performance

| Operation | Time    | Throughput |
| --------- | ------- | ---------- |
| PUBLISH   | ~0.05ms | 20k/sec    |
| SUBSCRIBE | ~0.01ms | N/A        |

---

## 🎉 Summary

**Use Streams when:**

- ✅ Heavy data từ service → server
- ✅ Cần guarantee delivery
- ✅ Cần persist data
- ✅ Multiple servers process cùng data
- ✅ Write vào database

**Use Pub/Sub when:**

- ✅ Lightweight commands từ server → service
- ✅ Real-time notifications
- ✅ Broadcast to many services
- ✅ Fire-and-forget

**Perfect combination:**

```
Service ─(Streams)──> Server ─(Pub/Sub)──> Service
        Heavy Data           Commands
```

🚀 **Best of both worlds!**
