# 🚀 Redis Quick Start Guide

## Cách sử dụng Redis để giao tiếp giữa các Services

### 📦 Setup nhanh

1. **Start Redis:**

```bash
docker-compose up -d redis
```

2. **Install dependencies:**

```bash
yarn install
```

---

## 🎯 3 Cách chính để Services giao tiếp

### 1️⃣ PUB/SUB - Gửi/Nhận Messages Realtime

**Khi nào dùng:**

- Service A cần thông báo cho nhiều services khác
- Real-time notifications
- Event broadcasting

**Service A (Gửi thông tin):**

```typescript
import { getRedisClient } from "./src/db/redis";

const redis = getRedisClient();

// Gửi thông báo token mới
await redis.publish(
  "channel:token:new",
  JSON.stringify({
    event: "TOKEN_CREATED",
    data: { id: "token-1", name: "BTC", address: "0x..." },
    timestamp: new Date().toISOString(),
  })
);
```

**Service B (Nhận thông tin):**

```typescript
import { createClient } from "redis";

const subscriber = createClient({
  /* config */
});
await subscriber.connect();

// Lắng nghe thông báo
await subscriber.subscribe("channel:token:new", (message) => {
  const event = JSON.parse(message);
  console.log("Nhận được token mới:", event.data);

  // Xử lý token
  handleNewToken(event.data);
});
```

**Test ngay:**

```bash
# Terminal 1
yarn example:subscriber

# Terminal 2
yarn example:publisher
```

---

### 2️⃣ MESSAGE QUEUE - Gửi Jobs cho Workers xử lý

**Khi nào dùng:**

- Background processing
- Phân tán công việc cho nhiều workers
- Đảm bảo mỗi job chỉ được xử lý 1 lần

**Service A (Gửi job):**

```typescript
import { getRedisClient } from "./src/db/redis";

const redis = getRedisClient();

// Tạo job
const job = {
  id: "job-" + Date.now(),
  type: "CRAWL_TOKEN",
  data: { tokenAddress: "0x...", chain: "ethereum" },
  status: "pending",
  createdAt: new Date().toISOString(),
};

// Thêm vào queue
await redis.lPush("queue:crawler-jobs", JSON.stringify(job));
console.log("✅ Job added to queue");
```

**Service Worker (Xử lý job):**

```typescript
import { getRedisClient } from "./src/db/redis";

const redis = getRedisClient();

// Worker loop
while (true) {
  // Lấy job từ queue (blocking - chờ đến khi có job)
  const result = await redis.brPop("queue:crawler-jobs", 0);

  if (result) {
    const job = JSON.parse(result.element);
    console.log("📦 Processing job:", job.id);

    // Xử lý job
    await processJob(job);

    // Lưu kết quả
    await redis.hSet(`job:result:${job.id}`, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    console.log("✅ Job completed");
  }
}
```

**Test ngay:**

```bash
# Terminal 1 - Start worker
yarn example:worker

# Terminal 2 - Send jobs
yarn example:publisher
```

---

### 3️⃣ CACHE & SHARED STATE - Chia sẻ dữ liệu

**Khi nào dùng:**

- Cache để giảm database queries
- Chia sẻ state giữa services
- Session management

**Service A (Lưu cache):**

```typescript
import { setRedisValue, setRedisHash } from "./src/db/redis";

// Cache simple value
await setRedisValue(
  "cache:token:123",
  JSON.stringify(tokenData),
  3600 // TTL: 1 hour
);

// Cache với hash (nhiều fields)
await setRedisHash("crawler:crawler-1", "status", "online");
await setRedisHash("crawler:crawler-1", "lastSeen", Date.now().toString());
```

**Service B (Đọc cache):**

```typescript
import { getRedisValue, getRedisHash, getAllRedisHash } from "./src/db/redis";

// Đọc simple value
const cached = await getRedisValue("cache:token:123");
if (cached) {
  const token = JSON.parse(cached);
  console.log("⚡ Cache hit:", token);
} else {
  // Cache miss - query database
  const token = await getTokenFromDB("123");
  // Save to cache
  await setRedisValue("cache:token:123", JSON.stringify(token), 3600);
}

// Đọc hash
const status = await getRedisHash("crawler:crawler-1", "status");
const allData = await getAllRedisHash("crawler:crawler-1");
```

---

## 📋 Ví dụ thực tế

### Scenario: Crawler Service giao tiếp với Monitor Service

**Crawler Service (Service A):**

```typescript
import { connectRedis, getRedisClient, setRedisHash } from "./src/db/redis";

async function startCrawler() {
  await connectRedis();
  const redis = getRedisClient();

  // 1. Set crawler online
  await setRedisHash("crawler:1", "status", "online");
  await setRedisHash("crawler:1", "lastSeen", new Date().toISOString());

  // 2. Publish event
  await redis.publish(
    "channel:crawler:status",
    JSON.stringify({
      event: "CRAWLER_ONLINE",
      crawlerId: "crawler-1",
      timestamp: new Date().toISOString(),
    })
  );

  // 3. Process tokens
  while (true) {
    // Crawl logic...
    const token = await crawlToken();

    // 4. Cache token data
    await redis.set(`cache:token:${token.id}`, JSON.stringify(token), {
      EX: 3600,
    });

    // 5. Notify other services
    await redis.publish("channel:token:new", JSON.stringify(token));

    // 6. Update stats
    await redis.hIncrBy("stats:crawler:1", "tokensProcessed", 1);
  }
}
```

**Monitor Service (Service B):**

```typescript
import { createClient } from "redis";
import { config } from "./src/config";

async function startMonitor() {
  const subscriber = createClient({
    socket: { host: config.redis.host, port: config.redis.port },
  });

  await subscriber.connect();

  // Monitor crawler status
  await subscriber.subscribe("channel:crawler:status", async (message) => {
    const event = JSON.parse(message);

    if (event.event === "CRAWLER_ONLINE") {
      console.log("✅ Crawler online:", event.crawlerId);
      await sendAlert(`Crawler ${event.crawlerId} is now online`);
    }
  });

  // Monitor new tokens
  await subscriber.subscribe("channel:token:new", async (message) => {
    const token = JSON.parse(message);
    console.log("📥 New token:", token.name);
    await updateDashboard(token);
  });
}
```

---

## 🎮 Test Commands

### Chạy đầy đủ 3 services:

```bash
# Terminal 1: Subscriber (Monitor Service)
yarn example:subscriber

# Terminal 2: Worker (Background Processor)
yarn example:worker

# Terminal 3: Publisher (Crawler Service)
yarn example:publisher
```

### Debug với Redis CLI:

```bash
# Connect to Redis
docker exec -it hodler-redis redis-cli

# Monitor all commands
MONITOR

# Check active channels
PUBSUB CHANNELS

# Check queue length
LLEN queue:crawler-jobs

# View jobs in queue
LRANGE queue:crawler-jobs 0 -1

# Get all keys
KEYS *

# Get cache
GET cache:token:123

# Get hash
HGETALL crawler:1
```

---

## 💡 Best Practices

### ✅ DO:

- Set TTL cho cache keys để tránh memory leak
- Sử dụng prefixes rõ ràng: `cache:`, `queue:`, `state:`
- Try-catch cho tất cả Redis operations
- Cleanup connections khi shutdown
- Monitor Redis memory usage

### ❌ DON'T:

- Không lưu sensitive data không mã hóa
- Không để cache keys không có expiration
- Không block main thread với long operations
- Không quên handle Redis connection errors

---

## 📊 So sánh 3 patterns

| Pattern     | Delivery                         | Workers                 | Use Case               |
| ----------- | -------------------------------- | ----------------------- | ---------------------- |
| **Pub/Sub** | Broadcast tới tất cả subscribers | Nhiều nhận cùng message | Events, Notifications  |
| **Queue**   | Chỉ 1 worker nhận                | 1 worker xử lý 1 job    | Background jobs, Tasks |
| **Cache**   | Read/Write trực tiếp             | N/A                     | Shared data, State     |

---

## 🐛 Troubleshooting

**Redis connection refused:**

```bash
docker-compose up -d redis
docker ps | grep redis
```

**Messages không được nhận:**

```bash
# Check subscriber
ps aux | grep subscriber

# Check channels
docker exec -it hodler-redis redis-cli PUBSUB CHANNELS
```

**Worker không xử lý jobs:**

```bash
# Check queue
docker exec -it hodler-redis redis-cli LLEN queue:crawler-jobs
```

---

## 📚 Đọc thêm

- 📖 **Chi tiết hơn:** Xem file `REDIS_USAGE_EXAMPLES.md`
- 💻 **Code examples:** Folder `examples/`
- 🔧 **Redis functions:** File `src/db/redis.ts`

---

## 🎉 Summary

Redis cung cấp 3 cách chính để services giao tiếp:

1. **Pub/Sub**: Broadcast messages → Nhiều services nhận
2. **Queue**: Jobs/Tasks → 1 worker xử lý
3. **Cache/State**: Shared data → Services read/write

Chọn pattern phù hợp với use case của bạn! 🚀
