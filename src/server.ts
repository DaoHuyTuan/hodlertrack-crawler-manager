import { Server } from 'socket.io'
import { init_socket } from './ws/io-server'

const PORT = Number(process.env.PORT) || 3000

const io = new Server(PORT, {
  cors: {
    origin: '*', // Trong production nên cấu hình cụ thể domain
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
})

// Initialize Socket.IO
init_socket(io)

console.log(`\n🚀 Socket.IO Server is running on port ${PORT}`)
console.log(`📡 WebSocket endpoints:`)
console.log(`   - Main: ws://localhost:${PORT}`)
console.log(`   - Crawler Events: ws://localhost:${PORT}/ws/v1/crawler-events`)
console.log(`   - Indexer Events: ws://localhost:${PORT}/ws/v1/indexer-events`)
console.log(
  `\n💡 Connect using Socket.IO client to: http://localhost:${PORT}\n`
)

export { io }
