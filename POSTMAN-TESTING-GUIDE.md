# 🧪 Postman Testing Guide

Hướng dẫn test Hub-Spoke Architecture bằng Postman

---

## 🚀 Quick Start

### Bước 1: Start Redis

```bash
docker-compose up -d redis
```

### Bước 2: Start API Server (Terminal 1)

```bash
yarn hub:api
```

### Bước 3: Start Crawler Service (Terminal 2)

```bash
yarn hub:crawler
```

### Bước 4: Start Monitor Service (Terminal 3) - Optional

```bash
yarn hub:monitor
```

### Bước 5: Import vào Postman

1. Mở Postman
2. Click **Import**
3. Chọn file `examples/Postman_Collection.json`
4. Bắt đầu test! 🎉

---

## 📋 Available Endpoints

### 1. Health & Status

#### GET `/api/health`

Kiểm tra server có đang chạy không

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "services": 0
}
```

#### GET `/api/services/status`

Xem status của tất cả services

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "serviceId": "crawler",
      "status": "online",
      "lastSeen": "2024-01-01T10:00:00.000Z",
      "online": true
    },
    {
      "serviceId": "monitor",
      "status": "online",
      "lastSeen": "2024-01-01T10:00:00.000Z",
      "online": true
    },
    {
      "serviceId": "analytics",
      "status": "unknown",
      "lastSeen": "never",
      "online": false
    }
  ]
}
```

---

### 2. Crawler Service Endpoints

#### POST `/api/crawler/crawl-token`

Yêu cầu crawl token data

**Request Body:**

```json
{
  "tokenAddress": "0xabc123def456789..."
}
```

**Response (Success):**

```json
{
  "success": true,
  "requestId": "req-1697123456789",
  "data": {
    "address": "0xabc123def456789...",
    "name": "Bitcoin",
    "symbol": "BTC",
    "decimals": 18,
    "totalSupply": "21000000",
    "holders": 1250000,
    "crawledAt": "2024-01-01T10:00:00.000Z"
  }
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "Request timeout"
}
```

#### POST `/api/crawler/crawl-transactions`

Yêu cầu crawl transactions

**Request Body:**

```json
{
  "tokenAddress": "0xabc123def456789..."
}
```

**Response:**

```json
{
  "success": true,
  "requestId": "req-1697123456790",
  "data": {
    "tokenAddress": "0xabc123def456789...",
    "transactions": [
      {
        "hash": "0xabc...",
        "from": "0x123...",
        "to": "0x456...",
        "value": "1000000"
      }
    ]
  }
}
```

---

### 3. Monitor Service Endpoints

#### POST `/api/monitor/check-status`

Kiểm tra status của crawler

**Request Body:**

```json
{
  "crawlerId": "crawler-1"
}
```

**Response:**

```json
{
  "success": true,
  "requestId": "req-1697123456791",
  "data": {
    "crawlerId": "crawler-1",
    "status": "online",
    "uptime": "2h 45m",
    "tokensProcessed": 250,
    "lastActivity": "2024-01-01T10:00:00.000Z",
    "health": "good"
  }
}
```

#### GET `/api/monitor/metrics`

Lấy system metrics

**Response:**

```json
{
  "success": true,
  "requestId": "req-1697123456792",
  "data": {
    "totalRequests": 1250,
    "successRate": 98.5,
    "avgResponseTime": "450ms",
    "activeServices": 3,
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
```

---

### 4. Analytics Service Endpoints

#### POST `/api/analytics/generate-report`

Generate analytics report

**Request Body:**

```json
{
  "period": "daily"
}
```

**Options cho period:**

- `"hourly"` - Báo cáo theo giờ
- `"daily"` - Báo cáo theo ngày
- `"weekly"` - Báo cáo theo tuần
- `"monthly"` - Báo cáo theo tháng

**Response:**

```json
{
  "success": true,
  "requestId": "req-1697123456793",
  "data": {
    "period": "daily",
    "reportData": {...},
    "generatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

---

## 🎬 Test Scenarios

### Scenario 1: Test cơ bản

1. **Check health**

   ```
   GET /api/health
   ```

   ✅ Expected: `status: "ok"`

2. **Check services**

   ```
   GET /api/services/status
   ```

   ✅ Expected: crawler = "online", monitor = "online"

3. **Crawl token**
   ```
   POST /api/crawler/crawl-token
   Body: { "tokenAddress": "0xtest123..." }
   ```
   ✅ Expected: Token data returned

---

### Scenario 2: Test timeout

1. **Stop Crawler Service** (Ctrl+C ở terminal crawler)

2. **Try crawl token**

   ```
   POST /api/crawler/crawl-token
   Body: { "tokenAddress": "0xtest123..." }
   ```

   ⏱️ Wait ~30 seconds
   ❌ Expected: `"error": "Request timeout"`

3. **Check service status**
   ```
   GET /api/services/status
   ```
   ✅ Expected: crawler = "offline" hoặc "unknown"

---

### Scenario 3: Test multiple requests

Gửi nhiều requests liên tục:

```
POST /api/crawler/crawl-token (token 1)
POST /api/crawler/crawl-token (token 2)
POST /api/crawler/crawl-token (token 3)
```

✅ Expected: Tất cả requests đều thành công

---

### Scenario 4: Test error handling

1. **Missing required field**

   ```
   POST /api/crawler/crawl-token
   Body: {}
   ```

   ❌ Expected: `400 Bad Request: "tokenAddress is required"`

2. **Invalid JSON**
   ```
   POST /api/crawler/crawl-token
   Body: {invalid json}
   ```
   ❌ Expected: `400 Bad Request: JSON parse error`

---

## 📊 Monitoring Terminal Output

### API Server Terminal:

```
📨 HTTP Request: POST /api/crawler/crawl-token
   Token: 0xabc123...
📤 API SERVER → Crawler Service
   Request ID: req-1697123456789
   Type: CRAWL_TOKEN

📥 API SERVER ← CRAWLER Service
   Request ID: req-1697123456789
   Status: success
```

### Crawler Service Terminal:

```
📥 CRAWLER ← Server
   Request ID: req-1697123456789
   Type: CRAWL_TOKEN
   Data: { tokenAddress: '0xabc123...' }
   ⚙️  Processing...
   🔍 Crawling token: 0xabc123...
   ✅ Token crawled successfully
   📤 CRAWLER → Server: Response sent (success)
```

---

## 🔧 Troubleshooting

### Error: "Cannot GET /api/..."

- ✅ Check: API Server đang chạy?
- ✅ Check: URL đúng? Port 3000?
- ✅ Check: Method đúng? (GET/POST)

### Error: "Request timeout"

- ✅ Check: Service tương ứng đang chạy?
- ✅ Check: Redis đang chạy?
- ✅ Terminal của service có log không?

### Error: "tokenAddress is required"

- ✅ Check: Request body có đúng format?
- ✅ Check: Content-Type = "application/json"?

### Response trả về nhưng data = null

- ✅ Check: Service có xử lý đúng request type không?
- ✅ Check: Terminal service có lỗi không?

---

## 💡 Tips

### 1. Environment trong Postman

Tạo environment với variables:

```
BASE_URL = http://localhost:3000
```

Sử dụng: `{{BASE_URL}}/api/health`

### 2. Tests Scripts

Thêm vào tab "Tests" trong Postman:

```javascript
// Check status code
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Check success
pm.test("Request successful", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.success).to.eql(true);
});

// Check response time
pm.test("Response time < 30s", function () {
  pm.expect(pm.response.responseTime).to.be.below(30000);
});
```

### 3. Collection Runner

Test toàn bộ collection:

1. Click "..." trên collection
2. Chọn "Run collection"
3. Xem tất cả results

---

## 🎯 Flow diagram

```
┌──────────┐         ┌────────────┐         ┌─────────┐
│ POSTMAN  │────────>│ API SERVER │────────>│  REDIS  │
└──────────┘  HTTP   └────────────┘  Queue  └────┬────┘
                            ^                     │
                            │                     │
                            │  Response           │ Request
                            │  (Pub/Sub)          │ (Queue)
                            │                     │
                            │                     v
                       ┌────┴─────────────────────────┐
                       │     CRAWLER SERVICE          │
                       └──────────────────────────────┘
```

**Flow:**

1. Postman gửi HTTP request → API Server
2. API Server forward request → Redis Queue
3. Service lấy request từ Queue
4. Service xử lý
5. Service gửi response → Redis Pub/Sub
6. API Server nhận response
7. API Server trả về HTTP response → Postman

---

## 📝 Example curl commands (alternative to Postman)

```bash
# Health check
curl http://localhost:3000/api/health

# Check services
curl http://localhost:3000/api/services/status

# Crawl token
curl -X POST http://localhost:3000/api/crawler/crawl-token \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"0xabc123..."}'

# Check status
curl -X POST http://localhost:3000/api/monitor/check-status \
  -H "Content-Type: application/json" \
  -d '{"crawlerId":"crawler-1"}'

# Get metrics
curl http://localhost:3000/api/monitor/metrics
```

---

## 🎉 Summary

**Test Hub-Spoke bằng Postman:**

1. ✅ Start Redis + API Server + Services
2. ✅ Import Postman collection
3. ✅ Gửi HTTP requests
4. ✅ API Server forward qua Redis
5. ✅ Services xử lý và trả kết quả
6. ✅ Nhận response trong Postman

**Easy peasy!** 🚀
