import { WebSocket } from 'ws'
import * as crawlerService from '../services/crawlerService'
import * as tokenService from '../services/tokenService'
import { config } from '../config'

interface CrawlerConnection {
  socket: WebSocket
  crawlerId: string
  lastPing: Date
  pingInterval?: NodeJS.Timeout
  timeoutCheck?: NodeJS.Timeout
  isAlive: boolean
}

class CrawlerConnectionManager {
  private connections: Map<string, CrawlerConnection> = new Map()
  private readonly PING_INTERVAL = config.websocket.pingInterval
  private readonly PING_TIMEOUT = config.websocket.pingTimeout

  constructor() {
    // No global ping scheduler - each connection manages its own ping
    console.log(
      `🔧 CrawlerConnectionManager initialized with PING_INTERVAL: ${this.PING_INTERVAL}ms, PING_TIMEOUT: ${this.PING_TIMEOUT}ms`
    )
  }

  // Add a new crawler connection
  async addConnection(crawlerId: string, socket: WebSocket): Promise<boolean> {
    try {
      // Check if crawler exists in database
      let crawler = await crawlerService.getCrawlerById(crawlerId)

      // If crawler doesn't exist, create a new one with default values
      if (!crawler) {
        console.log(
          `🆕 Crawler ${crawlerId} not found, creating new crawler...`
        )

        // Ensure we have a default token
        let defaultTokenId = 'default-token'
        try {
          // Try to get existing default token
          const existingToken = await tokenService.getTokenById(defaultTokenId)
          if (!existingToken) {
            // Create default token if it doesn't exist
            await tokenService.createToken({
              id: defaultTokenId,
              name: 'Default Token',
              address: '0x0000000000000000000000000000000000000000',
              chain: 'ethereum',
              digit: 18,
              blockDeploy: '0'
            })
            console.log(`✅ Created default token ${defaultTokenId}`)
          }
        } catch (tokenError) {
          console.error(`❌ Failed to create default token:`, tokenError)
          return false
        }

        // Create default crawler data
        const defaultCrawlerData = {
          id: crawlerId,
          name: `Crawler ${crawlerId}`,
          token: 'UNKNOWN',
          address: '0x0000000000000000000000000000000000000000',
          isOnline: false,
          tokenId: defaultTokenId
        }

        try {
          crawler = await crawlerService.createCrawler(defaultCrawlerData)
          console.log(`✅ Created new crawler ${crawlerId} with default values`)
        } catch (createError) {
          console.error(
            `❌ Failed to create crawler ${crawlerId}:`,
            createError
          )
          return false
        }
      }

      // Set crawler online
      await crawlerService.setCrawlerOnline(crawlerId)

      // Create new connection or update existing one
      const connection: CrawlerConnection = {
        socket,
        crawlerId,
        lastPing: new Date(),
        isAlive: true
      }

      // If connection already exists, clean up old intervals
      const existingConnection = this.connections.get(crawlerId)
      if (existingConnection) {
        if (existingConnection.pingInterval) {
          clearInterval(existingConnection.pingInterval)
        }
        if (existingConnection.timeoutCheck) {
          clearTimeout(existingConnection.timeoutCheck)
        }
        console.log(`🔄 Restarting ping for existing crawler ${crawlerId}`)
      }

      this.connections.set(crawlerId, connection)

      // Set up individual ping interval for this connection
      connection.pingInterval = setInterval(() => {
        this.pingConnection(crawlerId)
      }, this.PING_INTERVAL)

      // Set up individual timeout check for this connection
      connection.timeoutCheck = setTimeout(() => {
        this.checkConnectionTimeout(crawlerId)
      }, this.PING_TIMEOUT)

      console.log(`✅ Crawler ${crawlerId} connected and set online`)
      console.log(
        `🔧 Ping interval set to ${this.PING_INTERVAL}ms for crawler ${crawlerId}`
      )
      return true
    } catch (error) {
      console.error(
        `❌ Error adding connection for crawler ${crawlerId}:`,
        error
      )
      return false
    }
  }

  // Remove a crawler connection
  async removeConnection(crawlerId: string, reason?: string): Promise<void> {
    const connection = this.connections.get(crawlerId)
    if (connection) {
      // Clear ping interval
      if (connection.pingInterval) {
        clearInterval(connection.pingInterval)
      }

      // Clear timeout check
      if (connection.timeoutCheck) {
        clearTimeout(connection.timeoutCheck)
      }

      // Set crawler offline
      try {
        await crawlerService.setCrawlerOffline(crawlerId)
        const reasonText = reason ? ` (${reason})` : ''
        console.log(
          `📴 Crawler ${crawlerId} disconnected and set offline${reasonText}`
        )
      } catch (error) {
        console.error(`❌ Error setting crawler ${crawlerId} offline:`, error)
      }

      // Remove from connections map
      this.connections.delete(crawlerId)
    }
  }

  // Ping a specific connection
  private async pingConnection(crawlerId: string): Promise<void> {
    const connection = this.connections.get(crawlerId)
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      await this.removeConnection(crawlerId, 'WebSocket not open')
      return
    }

    // No need to check database every time - rely on WebSocket connection status

    // Send ping message
    const pingMessage = {
      type: 'ping',
      timestamp: new Date().toISOString(),
      crawlerId
    }

    try {
      connection.socket.send(JSON.stringify(pingMessage))
      console.log(
        `🏓 Ping sent to crawler ${crawlerId} at ${new Date().toISOString()}`
      )
    } catch (error) {
      console.error(`❌ Error sending ping to crawler ${crawlerId}:`, error)
      await this.removeConnection(crawlerId, 'Ping send error')
    }
  }

  // Handle pong response from crawler
  async handlePong(crawlerId: string): Promise<void> {
    const connection = this.connections.get(crawlerId)
    if (connection) {
      connection.lastPing = new Date()
      connection.isAlive = true
      console.log(
        `🏓 Pong received from crawler ${crawlerId} at ${new Date().toISOString()}`
      )

      // Set crawler online when receiving pong
      try {
        await crawlerService.setCrawlerOnline(crawlerId)
        console.log(`✅ Crawler ${crawlerId} set online due to pong response`)
      } catch (error) {
        console.error(`❌ Error setting crawler ${crawlerId} online:`, error)
      }

      // Clear existing timeout check
      if (connection.timeoutCheck) {
        clearTimeout(connection.timeoutCheck)
      }

      // Reset timeout check for this specific connection
      connection.timeoutCheck = setTimeout(() => {
        this.checkConnectionTimeout(crawlerId)
      }, this.PING_TIMEOUT)
    }
  }

  // Check timeout for a specific connection
  private async checkConnectionTimeout(crawlerId: string): Promise<void> {
    const connection = this.connections.get(crawlerId)
    if (!connection) return

    const now = new Date()
    const timeSinceLastPing = now.getTime() - connection.lastPing.getTime()

    console.log(
      `⏰ Checking timeout for crawler ${crawlerId}: ${timeSinceLastPing}ms since last ping (timeout: ${this.PING_TIMEOUT}ms)`
    )

    if (timeSinceLastPing > this.PING_TIMEOUT) {
      console.log(
        `💀 Connection timeout for crawler ${crawlerId} (${timeSinceLastPing}ms since last ping)`
      )

      // Set crawler offline in database but keep connection for potential welcome
      try {
        await crawlerService.setCrawlerOffline(crawlerId)
        console.log(
          `📴 Crawler ${crawlerId} set offline due to timeout (no pong)`
        )
      } catch (error) {
        console.error(`❌ Error setting crawler ${crawlerId} offline:`, error)
      }

      // Stop ping interval but keep connection alive for welcome event
      if (connection.pingInterval) {
        clearInterval(connection.pingInterval)
        connection.pingInterval = undefined
      }

      if (connection.timeoutCheck) {
        clearTimeout(connection.timeoutCheck)
        connection.timeoutCheck = undefined
      }

      console.log(
        `⏸️ Ping stopped for crawler ${crawlerId}, waiting for welcome event`
      )
    }
  }

  // Verify crawler status in database (only when needed)
  private async verifyCrawlerStatus(crawlerId: string): Promise<boolean> {
    try {
      const crawler = await crawlerService.getCrawlerById(crawlerId)
      return crawler ? crawler.isOnline : false
    } catch (error) {
      console.error(`❌ Error verifying crawler ${crawlerId} status:`, error)
      return false
    }
  }

  // Debug method to check connection status
  debugConnectionStatus(crawlerId: string): void {
    const connection = this.connections.get(crawlerId)
    if (connection) {
      const now = new Date()
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime()

      console.log(`🔍 Debug crawler ${crawlerId}:`)
      console.log(`   - Connection exists: ${!!connection}`)
      console.log(`   - Socket ready state: ${connection.socket.readyState}`)
      console.log(`   - Is alive: ${connection.isAlive}`)
      console.log(`   - Last ping: ${connection.lastPing.toISOString()}`)
      console.log(`   - Time since last ping: ${timeSinceLastPing}ms`)
      console.log(`   - Has ping interval: ${!!connection.pingInterval}`)
      console.log(`   - Has timeout check: ${!!connection.timeoutCheck}`)
      console.log(`   - Ping timeout: ${this.PING_TIMEOUT}ms`)
    } else {
      console.log(`🔍 Debug crawler ${crawlerId}: No connection found`)
    }
  }

  // Get all connections
  getAllConnections(): Map<string, CrawlerConnection> {
    return new Map(this.connections)
  }

  // Get connected crawler count
  getConnectedCount(): number {
    return this.connections.size
  }

  // Manually verify and sync crawler status with database
  async verifyAndSyncCrawlerStatus(crawlerId: string): Promise<void> {
    const connection = this.connections.get(crawlerId)
    if (!connection) return

    const isOnlineInDB = await this.verifyCrawlerStatus(crawlerId)

    if (!isOnlineInDB) {
      console.log(`🔄 Crawler ${crawlerId} is offline in database, syncing...`)
      await this.setCrawlerOfflineAndStopPing(crawlerId)
    } else {
      console.log(`✅ Crawler ${crawlerId} status verified as online`)
    }
  }

  // Set crawler offline and stop ping
  async setCrawlerOfflineAndStopPing(
    crawlerId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Set crawler offline in database
      await crawlerService.setCrawlerOffline(crawlerId)

      // Stop ping and remove connection
      await this.removeConnection(crawlerId, reason)

      const reasonText = reason ? ` (${reason})` : ''
      console.log(
        `📴 Crawler ${crawlerId} set offline and ping stopped${reasonText}`
      )
    } catch (error) {
      console.error(`❌ Error setting crawler ${crawlerId} offline:`, error)
    }
  }

  // Restart ping for existing connection
  restartPingForConnection(crawlerId: string): void {
    const connection = this.connections.get(crawlerId)
    if (!connection) {
      console.log(
        `❌ Cannot restart ping for crawler ${crawlerId}: No connection found`
      )
      return
    }

    // Clear existing intervals
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval)
    }
    if (connection.timeoutCheck) {
      clearTimeout(connection.timeoutCheck)
    }

    // Restart ping interval
    connection.pingInterval = setInterval(() => {
      this.pingConnection(crawlerId)
    }, this.PING_INTERVAL)

    // Restart timeout check
    connection.timeoutCheck = setTimeout(() => {
      this.checkConnectionTimeout(crawlerId)
    }, this.PING_TIMEOUT)

    connection.lastPing = new Date()
    connection.isAlive = true

    console.log(`🔄 Ping restarted for crawler ${crawlerId}`)
  }

  // Cleanup all connections
  async cleanup(): Promise<void> {
    for (const crawlerId of this.connections.keys()) {
      await this.removeConnection(crawlerId)
    }

    this.connections.clear()
    console.log('🧹 Crawler connection manager cleaned up')
  }
}

// Export singleton instance
export const crawlerConnectionManager = new CrawlerConnectionManager()
