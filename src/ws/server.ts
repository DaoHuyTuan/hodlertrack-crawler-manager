import { Server, IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { crawlerConnectionManager } from './crawlerConnectionManager'

let wss: WebSocketServer | null = null
let serviceEventHandler:
  | ((
      message: any,
      socket: WebSocket,
      crawlerId?: string
    ) => void | Promise<void>)
  | null = null

export function initWebSocketServer(httpServer: Server): void {
  // No fixed path so we can accept dynamic segments like /ws/crawler-events/<id>
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    // Expect path: /ws/crawler-events/<crawlerId>
    const url = new URL(request.url || '', 'http://localhost')
    const pathname = url.pathname || '/'
    const parts = pathname.split('/')
    const crawlerId =
      parts.length >= 4 && parts[1] === 'ws' && parts[2] === 'crawler-events'
        ? parts[3]
        : undefined

    if (!crawlerId) {
      // Reject connections that don't follow the expected path
      socket.send(
        JSON.stringify({
          error: 'Invalid path. Use /ws/crawler-events/<crawlerId>'
        })
      )
      socket.close()
      return
    }

    // Welcome message
    socket.send(
      JSON.stringify({
        type: 'welcome',
        message: 'Connected to Crawler Events WebSocket',
        timestamp: new Date().toISOString(),
        crawlerId
      })
    )

    socket.on('message', async (data: Buffer) => {
      try {
        const text = data.toString()
        const message = JSON.parse(text)
        
        console.log(`📨 Received message from crawler ${crawlerId}:`, message.type)

        // Handle welcome event
        if (message.type === 'welcome') {
          console.log(`🎉 Received welcome from crawler ${crawlerId}`)
          const success = await crawlerConnectionManager.addConnection(
            crawlerId,
            socket
          )

          if (success) {
            socket.send(
              JSON.stringify({
                type: 'welcome_ack',
                message: 'Welcome acknowledged, crawler set online',
                timestamp: new Date().toISOString(),
                crawlerId
              })
            )
          } else {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Failed to initialize crawler connection',
                timestamp: new Date().toISOString(),
                crawlerId
              })
            )
            socket.close()
            return
          }
        }
        // Handle pong response
        else if (message.type === 'pong') {
          console.log(`📨 Received pong from crawler ${crawlerId}`)
          await crawlerConnectionManager.handlePong(crawlerId)
        }
        // Handle other events
        else {
          // Invoke user handler if present
          if (serviceEventHandler) {
            await serviceEventHandler(message, socket, crawlerId)
          }

          // Broadcast to other clients
          if (wss) {
            const payload = JSON.stringify({
              type: 'event',
              data: message,
              crawlerId
            })
            wss.clients.forEach(client => {
              if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(payload)
              }
            })
          }
        }
      } catch (error) {
        socket.send(
          JSON.stringify({
            error: 'Invalid JSON message',
            timestamp: new Date().toISOString()
          })
        )
      }
    })

    socket.on('error', async (err: Error) => {
      console.error(`❌ WebSocket error for crawler ${crawlerId}:`, err.message)
      await crawlerConnectionManager.setCrawlerOfflineAndStopPing(
        crawlerId,
        `WebSocket error: ${err.message}`
      )
    })

    socket.on('close', async () => {
      console.log(`🔌 WebSocket connection closed for crawler ${crawlerId}`)
      await crawlerConnectionManager.setCrawlerOfflineAndStopPing(
        crawlerId,
        'WebSocket closed'
      )
    })
  })

  console.log('🚀 WebSocket server initialized on /ws/service-events')
}

export function setServiceEventHandler(
  handler: (
    message: any,
    socket: WebSocket,
    crawlerId?: string
  ) => void | Promise<void>
): void {
  serviceEventHandler = handler
  console.log('✅ Service event handler set')
}

export function getWebSocketServer(): WebSocketServer | null {
  return wss
}

export function broadcastToAllClients(message: any): void {
  if (!wss) {
    console.warn('⚠️ WebSocket server not initialized')
    return
  }

  const messageStr = JSON.stringify(message)
  let sentCount = 0

  wss.clients.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(messageStr)
      sentCount++
    }
  })

  console.log(`📢 Broadcasted message to ${sentCount} clients`)
}

export function getConnectedClientsCount(): number {
  if (!wss) return 0

  let count = 0
  wss.clients.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      count++
    }
  })
  return count
}
