import { config } from './config'
import { db } from './db/connection'
import * as tokenService from './services/tokenService'
import * as transactionService from './services/transactionService'
import * as crawlerService from './services/crawlerService'
import {
  initWebSocketServer,
  setServiceEventHandler,
  crawlerConnectionManager
} from './ws'
import { createServer } from 'http'

async function main() {
  try {
    console.log('🚀 Starting HodlerTrack Crawler...')
    console.log(`📊 Environment: ${config.nodeEnv}`)
    console.log(`🔗 Database: Connected`)
    console.log(`🔌 WebSocket Config:`)
    console.log(`   - URL: ${config.websocket.url}`)
    console.log(`   - Ping Interval: ${config.websocket.pingInterval}ms`)
    console.log(`   - Ping Timeout: ${config.websocket.pingTimeout}ms`)

    // Test database connection
    console.log('🔍 Testing database connection...')

    // Create HTTP server for WebSocket
    const httpServer = createServer()

    // Initialize WebSocket server
    initWebSocketServer(httpServer)

    // Set up service event handler (you can customize this)
    setServiceEventHandler(async (message, socket, crawlerId) => {
      console.log('🎯 Handling service event from crawler:', crawlerId, message)

      // Example handler - you can replace this with your logic
      const response = {
        type: 'response',
        originalMessage: message,
        processedAt: new Date().toISOString(),
        status: 'success',
        crawlerId
      }

      socket.send(JSON.stringify(response))
    })

    // Start HTTP server
    const PORT = process.env.PORT || 3000
    httpServer.listen(PORT, () => {
      console.log(`🌐 HTTP server listening on port ${PORT}`)
      console.log(
        `🔌 WebSocket available at ws://localhost:${PORT}/ws/crawler-events/<crawlerId>`
      )
    })

    // Example usage - you can uncomment these to test
    /*
    // Create a sample token
    const sampleToken = await tokenService.createToken({
      id: 'token-1',
      name: 'Bitcoin',
      address: '0x1234567890abcdef',
      chain: 'ethereum',
      digit: 18,
      blockDeploy: '12345678'
    });
    console.log('✅ Sample token created:', sampleToken);

    // Create a sample transaction
    const sampleTransaction = await transactionService.createTransaction({
      id: "0xfcf01af9b1461899d018ba21ce836197b28ead21c6c654e6f504419495cb5122",
      hash: "0xfcf01af9b1461899d018ba21ce836197b28ead21c6c654e6f504419495cb5122",
      from: "0x9adea960e2e41725fff6f0951c790bd6257dfb68",
      to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      value: "13695893495720796",
      blockHash: "0x8a0c1b0b8765fd5f87781c9187d8b2a81122aac3519d5fe4bddb7caa7802ff3a"
    });
    console.log('✅ Sample transaction created:', sampleTransaction);

    // Create a sample crawler
    const sampleCrawler = await crawlerService.createCrawler({
      id: 'crawler-1',
      name: 'Bitcoin Crawler',
      token: 'BTC',
      address: '0x1234567890abcdef',
      isOnline: true,
      tokenId: 'token-1'
    });
    console.log('✅ Sample crawler created:', sampleCrawler);
    */

    // Graceful shutdown handling
    const gracefulShutdown = async () => {
      console.log('🛑 Graceful shutdown initiated...')
      await crawlerConnectionManager.cleanup()
      process.exit(0)
    }

    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)

    console.log('✅ HodlerTrack Crawler is ready!')
    console.log('📝 Available service functions:')
    console.log('  - Token functions: Manage tokens with transactions')
    console.log(
      '  - Transaction functions: Manage transactions with transactions'
    )
    console.log('  - Crawler functions: Manage crawlers with transactions')
    console.log(
      '  - WebSocket Server: Service events at /ws/crawler-events/<crawlerId>'
    )
    console.log('🔌 Crawler connection management with ping/pong enabled')
  } catch (error) {
    console.error('❌ Error starting application:', error)
    process.exit(1)
  }
}

// Export service functions for external use
export { tokenService, transactionService, crawlerService, db }

// Export WebSocket functions
export * from './ws'

// Export types
export * from './types'

// Start the application if this file is run directly
if (require.main === module) {
  main()
}
