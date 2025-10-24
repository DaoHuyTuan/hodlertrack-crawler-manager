# Redis Usage Examples - Giao tiếp giữa các Services

## 1. Pub/Sub Pattern - Service gửi/nhận thông tin realtime

### Service A - Publisher (Gửi thông tin)

```typescript
import { getRedisClient } from "./src/db/redis";

// Service A gửi thông báo khi có transaction mới
async function notifyNewTransaction(transactionData: any) {
  const redis = getRedisClient();

  if (redis && redis.isOpen) {
    await redis.publish(
      "transaction:new",
      JSON.stringify({
        type: "NEW_TRANSACTION",
        data: transactionData,
        timestamp: new Date().toISOString(),
      })
    );
    console.log("📤 Published new transaction event");
  }
}

// Service A gửi thông báo token mới
async function notifyNewToken(tokenData: any) {
  const redis = getRedisClient();

  if (redis && redis.isOpen) {
    await redis.publish(
      "token:new",
      JSON.stringify({
        type: "NEW_TOKEN",
        data: tokenData,
        timestamp: new Date().toISOString(),
      })
    );
    console.log("📤 Published new token event");
  }
}
```

### Service B - Subscriber (Nhận thông tin)

```typescript
import { createClient } from "redis";
import { config } from "./src/config";

// Service B lắng nghe thông báo từ Service A
async function subscribeToEvents() {
  // Tạo subscriber client riêng (Redis yêu cầu connection riêng cho subscriber)
  const subscriber = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    password: config.redis.password,
    database: config.redis.db,
  });

  await subscriber.connect();

  // Lắng nghe channel 'transaction:new'
  await subscriber.subscribe("transaction:new", (message) => {
    const event = JSON.parse(message);
    console.log("📥 Service B received transaction:", event);

    // Xử lý transaction mới
    handleNewTransaction(event.data);
  });

  // Lắng nghe channel 'token:new'
  await subscriber.subscribe("token:new", (message) => {
    const event = JSON.parse(message);
    console.log("📥 Service B received token:", event);

    // Xử lý token mới
    handleNewToken(event.data);
  });

  // Lắng nghe nhiều channels với pattern
  await subscriber.pSubscribe("crawler:*", (message, channel) => {
    console.log(`📥 Received message from ${channel}:`, message);
  });
}

async function handleNewTransaction(data: any) {
  // Logic xử lý transaction
  console.log("Processing transaction:", data);
}

async function handleNewToken(data: any) {
  // Logic xử lý token
  console.log("Processing token:", data);
}
```

## 2. Message Queue Pattern - Xử lý jobs/tasks

### Producer Service (Gửi jobs)

```typescript
import { getRedisClient } from "./src/db/redis";

// Thêm job vào queue
async function addCrawlerJob(crawlerData: any) {
  const redis = getRedisClient();

  if (redis && redis.isOpen) {
    const job = {
      id: Date.now(),
      type: "CRAWL_TOKEN",
      data: crawlerData,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Push job vào list (queue)
    await redis.lPush("queue:crawler-jobs", JSON.stringify(job));
    console.log("✅ Added job to queue:", job.id);
  }
}

// Thêm multiple jobs
async function addMultipleCrawlerJobs(crawlersData: any[]) {
  const redis = getRedisClient();

  if (redis && redis.isOpen) {
    const jobs = crawlersData.map((data, index) =>
      JSON.stringify({
        id: Date.now() + index,
        type: "CRAWL_TOKEN",
        data: data,
        status: "pending",
        createdAt: new Date().toISOString(),
      })
    );

    // Push nhiều jobs cùng lúc
    await redis.lPush("queue:crawler-jobs", jobs);
    console.log(`✅ Added ${jobs.length} jobs to queue`);
  }
}
```

### Consumer Service (Xử lý jobs)

```typescript
import { getRedisClient } from "./src/db/redis";

// Service worker xử lý jobs từ queue
async function startWorker() {
  const redis = getRedisClient();

  if (!redis || !redis.isOpen) {
    throw new Error("Redis not connected");
  }

  console.log("🔄 Worker started, waiting for jobs...");

  while (true) {
    try {
      // BRPOP: Blocking right pop - chờ đến khi có job
      const result = await redis.brPop("queue:crawler-jobs", 0);

      if (result) {
        const job = JSON.parse(result.element);
        console.log("📦 Processing job:", job.id);

        // Xử lý job
        await processJob(job);

        // Lưu kết quả
        await redis.hSet(`job:${job.id}`, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });

        console.log("✅ Job completed:", job.id);
      }
    } catch (error) {
      console.error("❌ Error processing job:", error);
    }
  }
}

async function processJob(job: any) {
  // Logic xử lý job
  console.log("Processing:", job.type, job.data);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work
}
```

## 3. Cache Pattern - Lưu kết quả tạm thời

### Service lưu cache

```typescript
import {
  setRedisValue,
  getRedisValue,
  setRedisHash,
  getAllRedisHash,
} from "./src/db/redis";

// Cache token info
async function cacheTokenInfo(tokenId: string, tokenData: any) {
  const key = `cache:token:${tokenId}`;
  await setRedisValue(key, JSON.stringify(tokenData), 3600); // Cache 1 hour
  console.log("💾 Cached token:", tokenId);
}

// Lấy token từ cache
async function getTokenFromCache(tokenId: string) {
  const key = `cache:token:${tokenId}`;
  const cached = await getRedisValue(key);

  if (cached) {
    console.log("⚡ Cache hit for token:", tokenId);
    return JSON.parse(cached);
  }

  console.log("❌ Cache miss for token:", tokenId);
  return null;
}

// Cache với Hash - lưu nhiều fields
async function cacheTokenStats(tokenId: string, stats: any) {
  const key = `stats:token:${tokenId}`;

  await setRedisHash(
    key,
    "totalTransactions",
    stats.totalTransactions.toString()
  );
  await setRedisHash(key, "totalVolume", stats.totalVolume.toString());
  await setRedisHash(key, "lastUpdated", new Date().toISOString());

  console.log("💾 Cached token stats:", tokenId);
}

// Lấy token stats từ cache
async function getTokenStatsFromCache(tokenId: string) {
  const key = `stats:token:${tokenId}`;
  const stats = await getAllRedisHash(key);

  if (Object.keys(stats).length > 0) {
    console.log("⚡ Cache hit for token stats:", tokenId);
    return {
      totalTransactions: parseInt(stats.totalTransactions),
      totalVolume: parseFloat(stats.totalVolume),
      lastUpdated: stats.lastUpdated,
    };
  }

  return null;
}
```

## 4. Session/State Management - Chia sẻ state giữa services

### Service quản lý crawler state

```typescript
import {
  getRedisClient,
  setRedisHash,
  getRedisHash,
  getAllRedisHash,
} from "./src/db/redis";

// Set crawler online
async function setCrawlerOnline(crawlerId: string, metadata: any) {
  await setRedisHash(`crawler:${crawlerId}`, "status", "online");
  await setRedisHash(
    `crawler:${crawlerId}`,
    "lastSeen",
    new Date().toISOString()
  );
  await setRedisHash(
    `crawler:${crawlerId}`,
    "metadata",
    JSON.stringify(metadata)
  );

  // Thêm vào set của crawlers online
  const redis = getRedisClient();
  if (redis && redis.isOpen) {
    await redis.sAdd("crawlers:online", crawlerId);
  }

  console.log("🟢 Crawler online:", crawlerId);
}

// Set crawler offline
async function setCrawlerOffline(crawlerId: string) {
  await setRedisHash(`crawler:${crawlerId}`, "status", "offline");
  await setRedisHash(
    `crawler:${crawlerId}`,
    "lastSeen",
    new Date().toISOString()
  );

  const redis = getRedisClient();
  if (redis && redis.isOpen) {
    await redis.sRem("crawlers:online", crawlerId);
  }

  console.log("🔴 Crawler offline:", crawlerId);
}

// Lấy danh sách crawlers online
async function getOnlineCrawlers() {
  const redis = getRedisClient();
  if (redis && redis.isOpen) {
    const crawlerIds = await redis.sMembers("crawlers:online");

    const crawlers = await Promise.all(
      crawlerIds.map(async (id) => {
        const data = await getAllRedisHash(`crawler:${id}`);
        return { id, ...data };
      })
    );

    return crawlers;
  }
  return [];
}

// Lấy trạng thái crawler
async function getCrawlerStatus(crawlerId: string) {
  const status = await getRedisHash(`crawler:${crawlerId}`, "status");
  const lastSeen = await getRedisHash(`crawler:${crawlerId}`, "lastSeen");

  return { status, lastSeen };
}
```

## 5. Rate Limiting - Giới hạn requests

```typescript
import { getRedisClient } from "./src/db/redis";

// Check rate limit
async function checkRateLimit(
  serviceId: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || !redis.isOpen) return true;

  const key = `ratelimit:${serviceId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    // First request, set expiration
    await redis.expire(key, windowSeconds);
  }

  if (current > limit) {
    console.log(`⚠️ Rate limit exceeded for ${serviceId}: ${current}/${limit}`);
    return false;
  }

  return true;
}

// Sử dụng
async function processCrawlerRequest(crawlerId: string) {
  // Limit: 100 requests per 60 seconds
  const allowed = await checkRateLimit(`crawler:${crawlerId}`, 100, 60);

  if (!allowed) {
    throw new Error("Rate limit exceeded");
  }

  // Process request
  console.log("Processing crawler request:", crawlerId);
}
```

## 6. Distributed Lock - Đồng bộ giữa services

```typescript
import { getRedisClient } from "./src/db/redis";

// Acquire lock
async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 10
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || !redis.isOpen) return false;

  const acquired = await redis.set(`lock:${lockKey}`, "locked", {
    NX: true,
    EX: ttlSeconds,
  });

  return acquired === "OK";
}

// Release lock
async function releaseLock(lockKey: string): Promise<void> {
  const redis = getRedisClient();
  if (redis && redis.isOpen) {
    await redis.del(`lock:${lockKey}`);
  }
}

// Sử dụng lock
async function processCriticalSection(tokenId: string) {
  const lockKey = `process-token:${tokenId}`;

  const locked = await acquireLock(lockKey, 30);
  if (!locked) {
    console.log("❌ Could not acquire lock, another service is processing");
    return;
  }

  try {
    console.log("🔒 Lock acquired, processing...");

    // Critical section - chỉ 1 service xử lý tại 1 thời điểm
    await processToken(tokenId);

    console.log("✅ Processing completed");
  } finally {
    await releaseLock(lockKey);
    console.log("🔓 Lock released");
  }
}

async function processToken(tokenId: string) {
  // Logic xử lý
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
```

## 7. Event Tracking - Theo dõi events

```typescript
import { getRedisClient } from "./src/db/redis";

// Track event
async function trackEvent(eventType: string, data: any) {
  const redis = getRedisClient();
  if (!redis || !redis.isOpen) return;

  const event = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  // Lưu vào sorted set với timestamp làm score
  await redis.zAdd(`events:${eventType}`, {
    score: Date.now(),
    value: JSON.stringify(event),
  });

  // Giữ lại 1000 events gần nhất
  await redis.zRemRangeByRank(`events:${eventType}`, 0, -1001);
}

// Get recent events
async function getRecentEvents(eventType: string, count: number = 10) {
  const redis = getRedisClient();
  if (!redis || !redis.isOpen) return [];

  const events = await redis.zRange(`events:${eventType}`, -count, -1, {
    REV: true,
  });
  return events.map((e) => JSON.parse(e));
}

// Sử dụng
await trackEvent("transaction:created", { id: "tx-123", amount: 1000 });
await trackEvent("token:updated", { id: "token-456", name: "BTC" });

const recentTransactions = await getRecentEvents("transaction:created", 20);
console.log("Recent transactions:", recentTransactions);
```

## 8. Complete Example - Crawler Service Communication

### Service 1: Main Crawler Service

```typescript
import { connectRedis, getRedisClient, setRedisValue } from "./src/db/redis";
import * as crawlerService from "./src/services/crawlerService";

async function startCrawlerService() {
  await connectRedis();
  const redis = getRedisClient();

  // 1. Tạo crawler và notify
  const crawler = await crawlerService.createCrawler({
    id: "crawler-1",
    name: "Bitcoin Crawler",
    token: "BTC",
    address: "0x123",
    isOnline: true,
    tokenId: "token-1",
  });

  // 2. Publish event
  if (redis && redis.isOpen) {
    await redis.publish("crawler:created", JSON.stringify(crawler));
  }

  // 3. Set crawler online state
  await redis?.hSet(`crawler:${crawler.id}`, {
    status: "online",
    lastSeen: new Date().toISOString(),
  });

  // 4. Add crawler to active set
  await redis?.sAdd("crawlers:active", crawler.id);

  // 5. Cache crawler data
  await setRedisValue(
    `cache:crawler:${crawler.id}`,
    JSON.stringify(crawler),
    3600
  );

  console.log("✅ Crawler service started");
}
```

### Service 2: Monitor Service

```typescript
import { createClient } from "redis";
import { config } from "./src/config";

async function startMonitorService() {
  const subscriber = createClient({
    socket: { host: config.redis.host, port: config.redis.port },
  });

  await subscriber.connect();

  // Subscribe to crawler events
  await subscriber.subscribe("crawler:created", async (message) => {
    const crawler = JSON.parse(message);
    console.log("📥 New crawler detected:", crawler.name);

    // Send notification
    await sendNotification(`New crawler: ${crawler.name}`);

    // Update dashboard
    await updateDashboard(crawler);
  });

  console.log("✅ Monitor service started");
}
```

### Service 3: Analytics Service

```typescript
import { connectRedis, getRedisClient } from "./src/db/redis";

async function startAnalyticsService() {
  await connectRedis();
  const redis = getRedisClient();

  if (!redis || !redis.isOpen) return;

  // Get all active crawlers
  const activeCrawlers = await redis.sMembers("crawlers:active");

  for (const crawlerId of activeCrawlers) {
    const crawlerData = await redis.hGetAll(`crawler:${crawlerId}`);

    // Analyze crawler performance
    console.log(`Analyzing crawler ${crawlerId}:`, crawlerData);

    // Track metrics
    await redis.zIncrBy("metrics:crawler-uptime", 1, crawlerId);
  }

  console.log("✅ Analytics service started");
}
```

## Chạy ví dụ

1. **Start Redis:**

```bash
docker-compose up -d redis
```

2. **Install dependencies:**

```bash
yarn install
```

3. **Run services:**

```bash
# Terminal 1 - Main Service
yarn dev

# Terminal 2 - Worker Service
node worker.js

# Terminal 3 - Monitor Service
node monitor.js
```

## Best Practices

1. **Luôn check connection trước khi sử dụng Redis**
2. **Sử dụng try-catch cho tất cả Redis operations**
3. **Set expiration time cho cache để tránh memory leak**
4. **Sử dụng patterns/prefixes rõ ràng cho keys** (e.g., `cache:`, `session:`, `lock:`)
5. **Cleanup connections khi shutdown**
6. **Sử dụng pub/sub cho real-time communication**
7. **Sử dụng lists/sorted sets cho queues**
8. **Monitor Redis memory usage trong production**
