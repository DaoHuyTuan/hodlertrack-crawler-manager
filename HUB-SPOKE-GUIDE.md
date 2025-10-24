# 🎯 Hub-Spoke Architecture - Quick Guide

## Kiến trúc này là gì?

**Hub-Spoke** = Server trung tâm (Hub) giao tiếp với tất cả Services (Spokes)

```
         Services KHÔNG giao tiếp với nhau!
         Tất cả đều thông qua Server!

              ┌────────────┐
              │   SERVER   │  ← Hub (Trung tâm)
              │   (Hub)    │
              └──────┬─────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
    │Crawler  │ │Monitor │ │Analytics│  ← Spokes
    │Service  │ │Service │ │ Service │
    └─────────┘ └────────┘ └─────────┘

    ✅ Server ↔ Service
    ❌ Service ↔ Service
```

---

## 🚀 Cách chạy

### 1. Start Redis

```bash
docker-compose up -d redis
```

### 2. Start Server (Hub) - Terminal 1

```bash
yarn hub:server
```

### 3. Start Crawler Service - Terminal 2

```bash
yarn hub:crawler
```

### 4. Start Monitor Service - Terminal 3

```bash
yarn hub:monitor
```

---

## 📊 Flow hoạt động

### Flow 1: Server gửi request → Service xử lý → Service trả kết quả

```
┌─────────┐                    ┌─────────┐
│ SERVER  │                    │ SERVICE │
└────┬────┘                    └────┬────┘
     │                              │
     │ 1. Push request vào queue    │
     │─────────────────────────────>│
     │   queue:service:crawler:     │
     │         requests             │
     │                              │
     │                         2. Service lấy request
     │                              │
     │                         3. Xử lý
     │                              │
     │  4. Publish response         │
     │<─────────────────────────────│
     │   channel:server:            │
     │      responses               │
     │                              │
     │ 5. Server nhận & xử lý       │
     │                              │
```

### Flow 2: Service báo status

```
┌─────────┐                    ┌─────────┐
│ SERVER  │                    │ SERVICE │
└────┬────┘                    └────┬────┘
     │                              │
     │                         1. Mỗi 10s update
     │                              │
     │                    service:crawler:
     │                    {status: "online"}
     │                              │
     │ 2. Server check status       │
     │ bất cứ lúc nào              │
     │                              │
```

---

## 🎯 Key Components

### 1. Request Queue (Server → Service)

```typescript
// Mỗi service có queue riêng
queue:service:crawler:requests   ← Crawler Service
queue:service:monitor:requests   ← Monitor Service
queue:service:analytics:requests ← Analytics Service
```

### 2. Response Channel (Service → Server)

```typescript
// Tất cả services gửi responses về 1 channel
channel:server:responses ← Server lắng nghe
```

### 3. Service Status

```typescript
// Mỗi service lưu status
service:crawler → { status: "online", lastSeen: "..." }
service:monitor → { status: "online", lastSeen: "..." }
```

---

## 💻 Code Examples

### Server gửi request đến Service

```typescript
// Server
async sendToCrawlerService(tokenAddress: string) {
  const request = {
    id: `req-${Date.now()}`,
    type: "CRAWL_TOKEN",
    serviceId: "crawler",
    data: { tokenAddress },
    timestamp: new Date().toISOString(),
  };

  // Push vào queue riêng của Crawler
  await redis.lPush(
    "queue:service:crawler:requests",
    JSON.stringify(request)
  );

  console.log("📤 SERVER → Crawler Service");
}
```

### Service nhận request từ Server

```typescript
// Crawler Service
async listenToServerRequests() {
  while (true) {
    // Chờ request từ queue riêng
    const result = await redis.brPop(
      "queue:service:crawler:requests",
      5
    );

    if (result) {
      const request = JSON.parse(result.element);
      console.log("📥 CRAWLER ← Server");

      // Xử lý request
      await handleRequest(request);
    }
  }
}
```

### Service gửi response về Server

```typescript
// Crawler Service
async sendResponseToServer(requestId: string, status: string, data: any) {
  const response = {
    requestId,
    serviceId: "crawler",
    status,
    data,
    timestamp: new Date().toISOString(),
  };

  // Publish về server
  await redis.publish(
    "channel:server:responses",
    JSON.stringify(response)
  );

  console.log("📤 CRAWLER → Server");
}
```

### Server nhận response từ Service

```typescript
// Server
async listenToServiceResponses() {
  await subscriber.subscribe(
    "channel:server:responses",
    (message: string) => {
      const response = JSON.parse(message);
      console.log(`📥 SERVER ← ${response.serviceId} Service`);

      // Xử lý response
      handleServiceResponse(response);
    }
  );
}
```

---

## 🎬 Demo Output

### Server Terminal:

```
🏢 CENTRAL SERVER (HUB) STARTING
✅ Central Server is ready!
👂 Server is listening for service responses...

📤 SERVER → Crawler Service
   Request ID: req-1697123456789
   Type: CRAWL_TOKEN
   Data: { tokenAddress: '0xabc...' }

📥 SERVER ← CRAWLER Service
   Request ID: req-1697123456789
   Status: success
   ✅ SUCCESS
   Data: {
     address: '0xabc...',
     name: 'Bitcoin',
     symbol: 'BTC'
   }
   → Server: Saving token to database...
```

### Crawler Service Terminal:

```
🤖 CRAWLER SERVICE STARTING
✅ Registered with server: crawler
👂 Waiting for requests from server...

📥 CRAWLER ← Server
   Request ID: req-1697123456789
   Type: CRAWL_TOKEN
   Data: { tokenAddress: '0xabc...' }
   ⚙️  Processing...
   🔍 Crawling token: 0xabc...
   ✅ Token crawled successfully
   📤 CRAWLER → Server: Response sent (success)
```

---

## ✅ Advantages

1. **Tập trung kiểm soát** - Server điều khiển mọi giao tiếp
2. **Services độc lập** - Services không phụ thuộc nhau
3. **Dễ monitor** - Monitor tất cả từ Server
4. **Dễ scale** - Thêm/bớt services dễ dàng
5. **Clear responsibility** - Trách nhiệm rõ ràng

## ⚠️ Disadvantages

1. **Single point of failure** - Server down = toàn bộ hệ thống dừng
2. **Server bottleneck** - Server xử lý tất cả requests
3. **Latency** - Thêm 1 hop (qua server)

---

## 🔄 So sánh với Pub/Sub Pattern

| Aspect        | Hub-Spoke                 | Pub/Sub                  |
| ------------- | ------------------------- | ------------------------ |
| **Giao tiếp** | Qua Server                | Trực tiếp giữa services  |
| **Control**   | Tập trung                 | Phân tán                 |
| **Coupling**  | Loose                     | Looser                   |
| **Latency**   | Higher (qua server)       | Lower                    |
| **Monitor**   | Dễ (1 điểm)               | Khó (nhiều điểm)         |
| **Use case**  | Enterprise, cần kiểm soát | Microservices, real-time |

---

## 📝 Best Practices

### 1. Request Timeout

```typescript
// Server
const requestId = await server.sendToCrawlerService("0xabc...");

// Set timeout
setTimeout(async () => {
  const status = await checkRequestStatus(requestId);
  if (status === "pending") {
    console.warn("⚠️ Request timeout!");
  }
}, 30000); // 30 seconds
```

### 2. Retry Mechanism

```typescript
// Server
async sendWithRetry(serviceId: string, data: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await sendToService(serviceId, data);
      return;
    } catch (error) {
      console.log(`Retry ${i + 1}/${maxRetries}`);
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
}
```

### 3. Health Check

```typescript
// Server - Check services định kỳ
setInterval(async () => {
  const services = await getAllServicesStatus();

  services.forEach((service) => {
    if (service.status !== "online") {
      console.warn(`⚠️ ${service.serviceId} is ${service.status}`);
      // Send alert
    }
  });
}, 30000); // Every 30 seconds
```

### 4. Queue Monitoring

```typescript
// Server - Monitor queue length
async checkQueueHealth() {
  const services = ["crawler", "monitor", "analytics"];

  for (const serviceId of services) {
    const queueLength = await redis.lLen(
      `queue:service:${serviceId}:requests`
    );

    if (queueLength > 100) {
      console.warn(`⚠️ ${serviceId} queue is too long: ${queueLength}`);
    }
  }
}
```

---

## 🐛 Troubleshooting

### Service không nhận request

```bash
# Check queue có requests không
docker exec -it hodler-redis redis-cli LLEN queue:service:crawler:requests

# Xem requests trong queue
docker exec -it hodler-redis redis-cli LRANGE queue:service:crawler:requests 0 -1
```

### Server không nhận response

```bash
# Check có ai subscribe channel không
docker exec -it hodler-redis redis-cli PUBSUB CHANNELS

# Monitor real-time
docker exec -it hodler-redis redis-cli MONITOR
```

### Service status

```bash
# Check service status
docker exec -it hodler-redis redis-cli HGETALL service:crawler

# Check active services
docker exec -it hodler-redis redis-cli SMEMBERS services:active
```

---

## 🎓 Khi nào dùng Hub-Spoke?

✅ **Nên dùng khi:**

- Cần kiểm soát tập trung
- Enterprise applications
- Cần audit logs đầy đủ
- Security requirements cao
- Dễ maintain hơn scale

❌ **Không nên dùng khi:**

- Cần real-time, low latency
- Microservices architecture thuần
- Services cần giao tiếp nhanh với nhau
- Scale quan trọng hơn control

---

## 📚 Files liên quan

- `examples/hub-spoke-architecture.md` - Chi tiết kiến trúc
- `examples/hub-spoke-server.ts` - Central Server implementation
- `examples/hub-spoke-crawler.ts` - Crawler Service example
- `examples/hub-spoke-monitor.ts` - Monitor Service example

## 🎉 Summary

**Hub-Spoke** là pattern phù hợp khi bạn cần:

1. ✅ Kiểm soát tập trung
2. ✅ Services không giao tiếp trực tiếp
3. ✅ Dễ monitor và debug
4. ✅ Clear ownership và responsibility

Chạy thử ngay:

```bash
yarn hub:server    # Terminal 1
yarn hub:crawler   # Terminal 2
yarn hub:monitor   # Terminal 3
```
