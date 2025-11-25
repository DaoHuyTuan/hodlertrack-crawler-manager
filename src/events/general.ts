import { Socket } from 'socket.io'

export const handle_connection = (socket: Socket) => {
  console.log(`Client connected, socket ID: ${socket.id}`)

  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date()
  })
}

export const handle_disconnect = (socket: Socket, reason: string) => {
  console.log(`Client disconnected, socket ID: ${socket.id}, reason: ${reason}`)
}
