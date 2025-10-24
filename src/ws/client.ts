import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { config } from '../config'

export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  error?: string
}

export interface WebSocketEventData {
  data: any
  urlParams?: Record<string, string>
  crawlerId?: string
}

export interface WebSocketClientOptions {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  debug?: boolean
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts: number = 0
  private debug: boolean
  private isConnecting: boolean = false
  private shouldReconnect: boolean = true
  private urlParams: Record<string, string> = {}

  constructor(options: WebSocketClientOptions = {}) {
    super()
    this.url = options.url || config.websocket.url
    this.reconnectInterval = options.reconnectInterval || 5000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    this.debug = options.debug || false
    this.parseUrlParams()
  }

  /**
   * Khởi tạo kết nối WebSocket
   */
  public async init(): Promise<void> {
    if (this.isConnecting) {
      this.log('Already connecting...')
      return
    }

    this.isConnecting = true
    this.shouldReconnect = true

    try {
      await this.connect()
      this.log('WebSocket client initialized successfully')
    } catch (error) {
      this.log(`Failed to initialize WebSocket: ${error}`)
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * Lắng nghe events từ WebSocket
   * @param event - Tên event để lắng nghe (ví dụ: "events/crawler-events")
   * @param handler - Hàm xử lý khi nhận được event, có thể nhận URL params
   */
  public on(
    event: string,
    handler: (data: any, urlParams?: Record<string, string>) => void
  ): this {
    // Lưu handler cho event cụ thể với URL params
    super.on(`ws:${event}`, (data: any) => {
      handler(data, this.urlParams)
    })
    return this
  }

  /**
   * Gửi message qua WebSocket
   * @param event - Tên event
   * @param data - Dữ liệu gửi kèm
   */
  public send(event: string, data?: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('WebSocket not connected, cannot send message')
      return false
    }

    const message: WebSocketMessage = {
      type: event,
      data,
      timestamp: new Date().toISOString()
    }

    try {
      this.ws.send(JSON.stringify(message))
      this.log(`Sent message: ${event}`)
      return true
    } catch (error) {
      this.log(`Failed to send message: ${error}`)
      return false
    }
  }

  /**
   * Gửi message qua WebSocket (alias cho send)
   * @param event - Tên event
   * @param data - Dữ liệu gửi kèm
   */
  public emit(event: string, data?: any): boolean {
    return this.send(event, data)
  }

  /**
   * Đóng kết nối WebSocket
   */
  public close(): void {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.log('WebSocket connection closed')
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Lấy URL hiện tại
   */
  public getUrl(): string {
    return this.url
  }

  /**
   * Thay đổi URL và kết nối lại
   */
  public async setUrl(url: string): Promise<void> {
    this.url = url
    this.parseUrlParams()
    if (this.isConnected()) {
      this.close()
      await this.init()
    }
  }

  /**
   * Lấy URL parameters hiện tại
   */
  public getUrlParams(): Record<string, string> {
    return { ...this.urlParams }
  }

  /**
   * Lấy crawler ID từ URL (nếu có)
   */
  public getCrawlerId(): string | undefined {
    return this.urlParams.crawlerId
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.log(`Connecting to ${this.url}...`)

        this.ws = new WebSocket(this.url)

        this.ws.on('open', () => {
          this.log('WebSocket connected')
          this.reconnectAttempts = 0
          super.emit('connected')
          resolve()
        })

        this.ws.on('message', (data: Buffer) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString())
            this.log(`Received message: ${message.type}`)

            // Emit event với type của message (chỉ emit nội bộ, không gửi lên server)
            super.emit(`ws:${message.type}`, message.data || message)

            // Emit generic message event
            super.emit('ws:message', message)
          } catch (error) {
            this.log(`Failed to parse message: ${error}`)
            super.emit('ws:error', {
              error: 'Invalid JSON message',
              raw: data.toString()
            })
          }
        })

        this.ws.on('error', (error: Error) => {
          this.log(`WebSocket error: ${error.message}`)
          super.emit('ws:error', error)
          reject(error)
        })

        this.ws.on('close', (code: number, reason: string) => {
          this.log(`WebSocket closed: ${code} - ${reason}`)
          super.emit('ws:close', { code, reason })

          if (
            this.shouldReconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect()
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    this.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms`
    )

    setTimeout(async () => {
      if (this.shouldReconnect && !this.isConnected()) {
        try {
          await this.connect()
        } catch (error) {
          this.log(
            `Reconnect attempt ${this.reconnectAttempts} failed: ${error}`
          )
        }
      }
    }, this.reconnectInterval)
  }

  private parseUrlParams(): void {
    this.urlParams = {}

    try {
      const url = new URL(this.url)
      const pathname = url.pathname

      // Parse path segments để lấy parameters
      // Ví dụ: /ws/crawler-events/342343 -> crawlerId = 342343
      const segments = pathname.split('/').filter(segment => segment)

      // Tìm crawler-events và lấy ID tiếp theo
      const crawlerEventsIndex = segments.findIndex(
        segment => segment === 'crawler-events'
      )
      if (crawlerEventsIndex !== -1 && segments[crawlerEventsIndex + 1]) {
        this.urlParams.crawlerId = segments[crawlerEventsIndex + 1]
      }

      // Parse query parameters
      url.searchParams.forEach((value, key) => {
        this.urlParams[key] = value
      })

      this.log(`Parsed URL params: ${JSON.stringify(this.urlParams)}`)
    } catch (error) {
      this.log(`Failed to parse URL params: ${error}`)
    }
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[WebSocketClient] ${message}`)
    }
  }
}

// Export default instance
export const wsClient = new WebSocketClient()
