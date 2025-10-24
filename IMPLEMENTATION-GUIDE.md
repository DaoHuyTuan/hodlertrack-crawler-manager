# 🚀 Implementation Guide - Streams & Pub/Sub

## Kiến trúc đã implement

```
src/
├── streams/
│   ├── streamProducer.ts    # Service → Server (Heavy data)
│   ├── streamConsumer.ts    # Server nhận data từ Services
│   └── index.ts
├── pubsub/
│   ├── publisher.ts         # Server → Service (Commands)
│   ├── subscriber.ts        # Service nhận commands từ Server
│   └── index.ts
└── index.ts                 # Export all modules
```

---

## 📖 Usage

### 1. SERVICE: Gửi data về Server (Streams)

```typescript
import { connectRedis } from "./db/redis";
import {
  sendTokenToStream,
  sendTransactionsBatch,
  sendCrawlerEvent,
} from "./streams";

async function crawlerService() {
  // Connect Redis
  await connectRedis();

  // 1. Gửi token data
  const tokenData = {
    id: "token-123",
    name: "Bitcoin",
    address: "0xabc...",
    symbol: "BTC",
    decimals: 18,
    chain: "ethereum",
    blockDeploy: "15000000",
  };

  await sendTokenToStream("crawler-service", "TOKEN_CREATED", tokenData);

  // 2. Gửi batch transactions
  const transactions = [
    {
      id: "tx-1",
      hash: "0xdef...",
      from: "0x123...",
      to: "0x456...",
      value: "1000000",
      blockHash: "0x789...",
    },
    // ... more transactions
  ];

  await sendTransactionsBatch("crawler-service", transactions);

  // 3. Gửi event
  await sendCrawlerEvent("crawler-service", "CRAWLER_ONLINE", {
    crawlerId: "crawler-1",
    timestamp: new Date().toISOString(),
  });
}
```

---

### 2. SERVER: Nhận data từ Services (Streams)

```typescript
import { connectRedis } from "./db/redis";
import { startStreamConsumers, getStreamStats } from "./streams";

async function server() {
  // Connect Redis
  await connectRedis();

  // Start consuming streams
  await startStreamConsumers({
    // Custom token handler
    onTokenMessage: async (message) => {
      console.log("Processing token:", message.tokenData);
      // Custom logic here
    },

    // Custom transaction batch handler
    onTransactionBatch: async (transactions) => {
      console.log(`Processing ${transactions.length} transactions`);
      // Custom batch processing
    },

    // Custom event handler
    onCrawlerEvent: async (event) => {
      console.log("Crawler event:", event.type);
      // Custom event handling
    },
  });

  // Check stats periodically
  setInterval(async () => {
    const stats = await getStreamStats();
    console.log("Stream stats:", stats);
  }, 30000);
}
```

**Hoặc dùng default handlers (tự động save vào DB):**

```typescript
import { startStreamConsumers } from "./streams";

// Không truyền handlers → auto save to database
await startStreamConsumers();
```

---

### 3. SERVER: Gửi commands đến Services (Pub/Sub)

```typescript
import {
  initPublisher,
  sendCommandToService,
  broadcastNotification,
} from "./pubsub";

async function server() {
  // Initialize publisher
  await initPublisher();

  // 1. Send command to specific service
  await sendCommandToService("crawler-service", "START_CRAWLING", {
    tokenAddress: "0xabc...",
  });

  await sendCommandToService("crawler-service", "PAUSE", {});

  // 2. Broadcast notification to all services
  await broadcastNotification("token:created", {
    address: "0xabc...",
    name: "Bitcoin",
  });

  // 3. Custom publish
  await publish("channel:custom", { data: "anything" });
}
```

---

### 4. SERVICE: Nhận commands từ Server (Pub/Sub)

```typescript
import {
  initSubscriber,
  subscribeToCommands,
  subscribeToBroadcast,
} from "./pubsub";

async function crawlerService() {
  // Initialize subscriber
  await initSubscriber();

  // 1. Subscribe to commands
  await subscribeToCommands("crawler-service", async (command, data) => {
    console.log(`Received command: ${command}`);

    switch (command) {
      case "START_CRAWLING":
        await startCrawling(data.tokenAddress);
        break;

      case "PAUSE":
        await pauseCrawling();
        break;

      case "STOP":
        await stopCrawling();
        break;

      default:
        console.log(`Unknown command: ${command}`);
    }
  });

  // 2. Subscribe to broadcasts
  await subscribeToBroadcast("token:created", async (message) => {
    const data = JSON.parse(message);
    console.log("Token created broadcast:", data);
  });
}
```

---

## 🎯 Complete Example

### Server Application

```typescript
import { connectRedis, disconnectRedis } from "./db/redis";
import { startStreamConsumers } from "./streams";
import { initPublisher, sendCommandToService, closePublisher } from "./pubsub";

async function startServer() {
  try {
    console.log("🏢 Starting Server...");

    // 1. Connect Redis
    await connectRedis();

    // 2. Initialize publisher for sending commands
    await initPublisher();

    // 3. Start consuming streams from services
    await startStreamConsumers();

    console.log("✅ Server is ready!");

    // 4. Demo: Send command to service
    setTimeout(async () => {
      await sendCommandToService("crawler", "START_CRAWLING", {
        tokenAddress: "0xabc123...",
      });
    }, 5000);

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down server...");
      await closePublisher();
      await disconnectRedis();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
}

startServer();
```

### Crawler Service Application

```typescript
import { connectRedis, disconnectRedis } from "./db/redis";
import {
  sendTokenToStream,
  sendTransactionsBatch,
  sendCrawlerEvent,
} from "./streams";
import { initSubscriber, subscribeToCommands, closeSubscriber } from "./pubsub";

let isRunning = true;
let isPaused = false;

async function startCrawlerService() {
  try {
    console.log("🤖 Starting Crawler Service...");

    // 1. Connect Redis
    await connectRedis();

    // 2. Initialize subscriber for receiving commands
    await initSubscriber();

    // 3. Subscribe to commands from server
    await subscribeToCommands("crawler", handleCommand);

    // 4. Send online event
    await sendCrawlerEvent("crawler", "CRAWLER_ONLINE", {
      crawlerId: "crawler-1",
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Crawler Service is ready!");

    // 5. Start crawling
    startCrawling();

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down crawler...");
      isRunning = false;

      await sendCrawlerEvent("crawler", "CRAWLER_OFFLINE", {
        crawlerId: "crawler-1",
        timestamp: new Date().toISOString(),
      });

      await closeSubscriber();
      await disconnectRedis();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Crawler error:", error);
    process.exit(1);
  }
}

async function handleCommand(command: string, data: any) {
  switch (command) {
    case "START_CRAWLING":
      isPaused = false;
      if (data.tokenAddress) {
        await crawlToken(data.tokenAddress);
      }
      break;

    case "PAUSE":
      isPaused = true;
      console.log("⏸️  Paused");
      break;

    case "STOP":
      isRunning = false;
      console.log("⏹️  Stopped");
      break;

    default:
      console.log(`⚠️  Unknown command: ${command}`);
  }
}

async function startCrawling() {
  while (isRunning) {
    if (!isPaused) {
      const tokenAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
      await crawlToken(tokenAddress);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function crawlToken(tokenAddress: string) {
  try {
    console.log(`\n🔍 Crawling token: ${tokenAddress}`);

    // Simulate crawling
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const tokenData = {
      id: `token-${Date.now()}`,
      address: tokenAddress,
      name: `Token ${Math.floor(Math.random() * 1000)}`,
      symbol: `TK${Math.floor(Math.random() * 100)}`,
      decimals: 18,
      chain: "ethereum",
      blockDeploy: `${Math.floor(Math.random() * 15000000)}`,
    };

    console.log(`✅ Token crawled: ${tokenData.name}`);

    // Send to server via stream
    await sendTokenToStream("crawler", "TOKEN_CREATED", tokenData);

    // Crawl transactions
    const transactions = Array.from({ length: 3 }, (_, i) => ({
      id: `tx-${Date.now()}-${i}`,
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      from: `0x${Math.random().toString(16).substring(2, 42)}`,
      to: `0x${Math.random().toString(16).substring(2, 42)}`,
      value: `${Math.floor(Math.random() * 1000000000)}`,
      blockHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    }));

    await sendTransactionsBatch("crawler", transactions);
  } catch (error) {
    console.error("❌ Crawl error:", error);

    await sendCrawlerEvent("crawler", "CRAWLER_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
      tokenAddress,
    });
  }
}

startCrawlerService();
```

---

## 📁 File Structure

```
src/
├── streams/
│   ├── streamProducer.ts      # sendTokenToStream, sendTransactionsBatch, etc
│   ├── streamConsumer.ts      # startStreamConsumers, getStreamStats
│   └── index.ts
├── pubsub/
│   ├── publisher.ts           # sendCommandToService, broadcastNotification
│   ├── subscriber.ts          # subscribeToCommands, subscribeToBroadcast
│   └── index.ts
├── services/
│   ├── tokenService.ts        # Database operations
│   ├── transactionService.ts
│   └── crawlerService.ts
├── db/
│   ├── redis.ts               # connectRedis, disconnectRedis
│   └── connection.ts
└── index.ts                   # Export all modules
```

---

## 🎯 Quick Reference

### Stream Functions (Service → Server)

| Function                    | Purpose                    |
| --------------------------- | -------------------------- |
| `sendTokenToStream()`       | Send token data            |
| `sendTransactionToStream()` | Send single transaction    |
| `sendTransactionsBatch()`   | Send multiple transactions |
| `sendCrawlerEvent()`        | Send event (status/error)  |
| `startStreamConsumers()`    | Server: Start consuming    |
| `getStreamStats()`          | Get stream statistics      |

### Pub/Sub Functions (Server ↔ Service)

| Function                  | Purpose                   |
| ------------------------- | ------------------------- |
| `initPublisher()`         | Initialize publisher      |
| `sendCommandToService()`  | Send command to service   |
| `broadcastNotification()` | Broadcast to all services |
| `initSubscriber()`        | Initialize subscriber     |
| `subscribeToCommands()`   | Listen to commands        |
| `subscribeToBroadcast()`  | Listen to broadcasts      |

---

## 🎉 That's it!

**Usage:**

```typescript
// Service
import { sendTokenToStream } from "./streams";
import { subscribeToCommands } from "./pubsub";

// Server
import { startStreamConsumers } from "./streams";
import { sendCommandToService } from "./pubsub";
```

**Simple. Clean. Production-ready.** 🚀
