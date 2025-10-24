# 🌊 Redis Streams + Pub/Sub - Production Ready

## ✅ Đã implement vào source code

```
src/
├── streams/           # Service → Server (Heavy data)
│   ├── streamProducer.ts
│   ├── streamConsumer.ts
│   └── index.ts
├── pubsub/            # Server ↔ Service (Commands)
│   ├── publisher.ts
│   ├── subscriber.ts
│   └── index.ts
└── index.ts           # Export tất cả
```

---

## 🚀 Usage nhanh

### Service gửi data (Streams):

```typescript
import { connectRedis } from "./db/redis";
import { sendTokenToStream, sendTransactionsBatch } from "./streams";

await connectRedis();

// Gửi token
await sendTokenToStream("crawler", "TOKEN_CREATED", {
  name: "Bitcoin",
  address: "0xabc...",
  // ...
});

// Gửi batch transactions
await sendTransactionsBatch("crawler", transactions);
```

### Server nhận data (Streams):

```typescript
import { connectRedis } from "./db/redis";
import { startStreamConsumers } from "./streams";

await connectRedis();

// Auto save to database
await startStreamConsumers();

// Hoặc custom handlers
await startStreamConsumers({
  onTokenMessage: async (msg) => {
    console.log("Token:", msg.tokenData);
  },
  onTransactionBatch: async (txs) => {
    console.log(`${txs.length} transactions`);
  },
});
```

### Server gửi commands (Pub/Sub):

```typescript
import { initPublisher, sendCommandToService } from "./pubsub";

await initPublisher();

await sendCommandToService("crawler", "START_CRAWLING", {
  tokenAddress: "0xabc...",
});
```

### Service nhận commands (Pub/Sub):

```typescript
import { initSubscriber, subscribeToCommands } from "./pubsub";

await initSubscriber();

await subscribeToCommands("crawler", async (command, data) => {
  if (command === "START_CRAWLING") {
    await startCrawling(data);
  }
});
```

---

## 📚 Documentation

- **IMPLEMENTATION-GUIDE.md** ← Complete examples
- **REDIS-STREAMS-GUIDE.md** ← Detailed architecture
- **STREAMS-QUICK-START.md** ← Quick start guide

---

## 🎯 Key Features

### Streams (Service → Server):

- ✅ **Persistent**: Data không mất khi restart
- ✅ **Consumer Groups**: Multiple servers process
- ✅ **Guaranteed Delivery**: ACK mechanism
- ✅ **Batch Processing**: High performance
- ✅ **Auto Trim**: Giới hạn memory

### Pub/Sub (Server → Service):

- ✅ **Real-time**: Instant delivery
- ✅ **Lightweight**: No persistence needed
- ✅ **Broadcast**: To nhiều services
- ✅ **Simple**: Fire-and-forget

---

## 🎭 Architecture

```
┌─────────────┐                        ┌─────────────┐
│   SERVICE   │                        │   SERVER    │
│             │                        │             │
│  Send data  │──(Streams)──>          │  Consume    │
│  - Tokens   │   Persistent           │  - Save DB  │
│  - Txs      │   Guaranteed           │  - Process  │
│             │                        │             │
│  Listen cmd │<──(Pub/Sub)──          │  Send cmds  │
│  - Execute  │   Real-time            │  - Control  │
└─────────────┘                        └─────────────┘
```

---

## 💡 When to Use What?

### Use Streams when:

- Service gửi nhiều data về server
- Cần guarantee delivery
- Write heavy vào database
- Cần replay messages

### Use Pub/Sub when:

- Server gửi commands đến services
- Real-time notifications
- Broadcast to many services
- Fire-and-forget is OK

---

## 🔧 Installation

Already installed! Just import and use:

```typescript
// Import from main entry point
import {
  // Streams
  sendTokenToStream,
  sendTransactionsBatch,
  startStreamConsumers,
  // Pub/Sub
  sendCommandToService,
  subscribeToCommands,
} from "./src";
```

---

## 📊 Monitoring

```typescript
import { getStreamStats } from "./streams";

// Get stats
const stats = await getStreamStats();
console.log(stats);

// Output:
// {
//   'stream:tokens': { length: 123, pending: 5 },
//   'stream:transactions': { length: 456, pending: 0 },
//   'stream:crawler-events': { length: 78, pending: 0 }
// }
```

---

## 🎉 Ready to Use!

**No examples needed. Real implementation in source code.**

**Functions-based. Clean. Production-ready.** 🚀

Read **IMPLEMENTATION-GUIDE.md** for complete examples!
