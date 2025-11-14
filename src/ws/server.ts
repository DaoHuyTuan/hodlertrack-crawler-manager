import { Server, IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { crawlerConnectionManager } from './crawlerConnectionManager'
import { create_crawler_event, welcome_event } from '../events/crawler-events'

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
      handle_event(data)
    })

    socket.on('pong', async (data: Buffer) => {
      console.log('hello pong', data)
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

export const handle_event = async (data: Buffer) => {
  const parsed_data = JSON.parse(data.toString())
  console.log('parsed_data', parsed_data)
  switch (parsed_data.type) {
    case 'welcome':
      welcome_event()
      break
    case 'create_crawler':
      create_crawler_event(parsed_data.data)
      break
    default:
      return
  }
  try {
  } catch (error) {
    console.log('handle_event', error)
  }
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
