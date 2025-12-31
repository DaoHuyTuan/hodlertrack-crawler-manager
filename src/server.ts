import { Server } from 'socket.io'
import { init_socket } from './ws/io-server'
import { createServer } from 'http'

const PORT = Number(process.env.PORT) || 3000
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Trong production nên cấu hình cụ thể domain
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// Initialize Socket.IO
init_socket(io)
httpServer.listen(3000, () => {
  console.log('🚀 Socket.IO server on port 3000')
})

console.log(`\n🚀 Socket.IO Server is running on port ${PORT}`)
console.log(`📡 WebSocket endpoints:`)
console.log(`   - Main: ws://localhost:${PORT}`)
console.log(`   - Crawler Events: ws://localhost:${PORT}/ws/v1/crawler-events`)
console.log(`   - Indexer Events: ws://localhost:${PORT}/ws/v1/indexer-events`)
console.log(
  `\n💡 Connect using Socket.IO client to: http://localhost:${PORT}\n`
)

// export { io }
