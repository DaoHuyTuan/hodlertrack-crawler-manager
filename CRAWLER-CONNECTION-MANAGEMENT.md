# Crawler Connection Management

## Tổng quan

Hệ thống WebSocket server đã được nâng cấp để tự động quản lý trạng thái online/offline của các crawler thông qua ping/pong mechanism.

## Cách hoạt động

### 1. Kết nối và Welcome Event

Khi một service crawler kết nối với WebSocket server:

```
ws://localhost:3000/ws/crawler-events/<crawlerId>
```

Service sẽ gửi welcome event:

```json
{
  "type": "welcome"
}
```

Server sẽ:

- Kiểm tra crawler có tồn tại trong database không
- Nếu có: set `is_online = true` và gửi `welcome_ack`
- Nếu không: tự động tạo crawler mới với giá trị mặc định, sau đó set `is_online = true` và gửi `welcome_ack`

### 2. Ping/Pong Mechanism

- **Individual Ping Intervals**: Mỗi crawler có ping interval riêng biệt (30 giây)
- **Individual Timeout**: Mỗi crawler có timeout check riêng biệt (60 giây = 1 phút)
- **Isolated Behavior**: Một crawler offline không ảnh hưởng đến các crawler khác
- **Simple Logic**: Có pong = set online, không có pong trong 1 phút = set offline
- **Timeout Behavior**: Khi timeout, set offline và ngừng ping nhưng giữ connection
- **Welcome Restart**: Khi nhận welcome event, restart ping cho crawler đó
- **Pong Response**: Crawler phải trả lời với `type: "pong"` để reset timeout

### 3. Tự động Cleanup

- Khi crawler disconnect: tự động set `is_online = false`
- Khi ping timeout: tự động set `is_online = false`
- Graceful shutdown: cleanup tất cả connections

## API Events

### Server → Crawler

#### Ping

```json
{
  "type": "ping",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "crawlerId": "crawler-123"
}
```

#### Welcome Acknowledgment

```json
{
  "type": "welcome_ack",
  "message": "Welcome acknowledged, crawler set online",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "crawlerId": "crawler-123"
}
```

### Crawler → Server

#### Welcome

```json
{
  "type": "welcome"
}
```

#### Pong

```json
{
  "type": "pong"
}
```

## Database Schema

Crawler table có field `is_online` để track trạng thái:

```sql
is_online BOOLEAN DEFAULT FALSE NOT NULL
```

## Monitoring

Server logs sẽ hiển thị:

- `🎉 Received welcome from crawler <id>`
- `🆕 Crawler <id> not found, creating new crawler...` (nếu crawler chưa tồn tại)
- `✅ Created default token <id>` (nếu cần tạo default token)
- `✅ Created new crawler <id> with default values` (nếu tạo crawler mới)
- `✅ Crawler <id> connected and set online`
- `🔄 Restarting ping for existing crawler <id>` (restart ping khi welcome)
- `🏓 Ping sent to crawler <id>` (dựa vào WebSocket connection)
- `🏓 Pong received from crawler <id>` (reset timeout và set online)
- `✅ Crawler <id> set online due to pong response` (set online khi có pong)
- `💀 Connection timeout for crawler <id>` (timeout riêng biệt)
- `📴 Crawler <id> set offline due to timeout (no pong)` (set offline khi không có pong)
- `⏸️ Ping stopped for crawler <id>, waiting for welcome event` (ngừng ping, giữ connection)

## Cấu hình

Các thông số có thể điều chỉnh thông qua environment variables:

```bash
# WebSocket Configuration
PING_INTERVAL=30000    # Ping interval in milliseconds (default: 30000ms = 30s)
PING_TIMEOUT=10000     # Ping timeout in milliseconds (default: 10000ms = 10s)
WEBSOCKET_URL=ws://localhost:3000
```

### Environment Variables

| Variable        | Default               | Description                                         |
| --------------- | --------------------- | --------------------------------------------------- |
| `PING_INTERVAL` | `30000`               | Interval between ping messages (milliseconds)       |
| `PING_TIMEOUT`  | `60000`               | Timeout for ping response (milliseconds) - 1 minute |
| `WEBSOCKET_URL` | `ws://localhost:3000` | WebSocket server URL                                |

### Ví dụ cấu hình

```bash
# .env file
PING_INTERVAL=60000    # Ping mỗi 60 giây
PING_TIMEOUT=15000     # Timeout sau 15 giây
```

Hoặc khi chạy:

```bash
PING_INTERVAL=45000 PING_TIMEOUT=12000 npm start
```

## Auto-Creation Feature

### Tự động tạo Crawler

Khi một crawler với ID chưa tồn tại kết nối và gửi welcome event, hệ thống sẽ:

1. **Tạo Default Token** (nếu chưa có):

   ```json
   {
     "id": "default-token",
     "name": "Default Token",
     "address": "0x0000000000000000000000000000000000000000",
     "chain": "ethereum",
     "digit": 18,
     "blockDeploy": "0"
   }
   ```

2. **Tạo Crawler mới** với thông tin mặc định:

   ```json
   {
     "id": "<crawlerId>",
     "name": "Crawler <crawlerId>",
     "token": "UNKNOWN",
     "address": "0x0000000000000000000000000000000000000000",
     "isOnline": false,
     "tokenId": "default-token"
   }
   ```

3. **Set crawler online** và thiết lập ping/pong mechanism

### Cập nhật thông tin Crawler

Sau khi crawler được tạo tự động, bạn có thể cập nhật thông tin thông qua API:

```typescript
import * as crawlerService from './services/crawlerService'

// Cập nhật thông tin crawler
await crawlerService.updateCrawler('crawler-123', {
  name: 'Bitcoin Crawler',
  token: 'BTC',
  address: '0x1234567890abcdef',
  tokenId: 'bitcoin-token'
})
```

## Sử dụng

### Kiểm tra trạng thái crawler

```typescript
import { crawlerConnectionManager } from './ws'

// Lấy thông tin connection
const connection = crawlerConnectionManager.getConnectionInfo('crawler-123')

// Lấy số lượng crawler đang kết nối
const count = crawlerConnectionManager.getConnectedCount()

// Lấy tất cả connections
const allConnections = crawlerConnectionManager.getAllConnections()
```

### Service Functions

```typescript
import * as crawlerService from './services/crawlerService'

// Lấy crawler online
const onlineCrawlers = await crawlerService.getOnlineCrawlers()

// Lấy crawler offline
const offlineCrawlers = await crawlerService.getOfflineCrawlers()

// Set crawler online/offline manually
await crawlerService.setCrawlerOnline('crawler-123')
await crawlerService.setCrawlerOffline('crawler-123')
```
