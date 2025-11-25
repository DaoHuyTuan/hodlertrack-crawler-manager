import { Server, Socket } from 'socket.io'
import { handle_connection, handle_disconnect } from './general'

export const setup_indexer_events = (io: Server) => {
  const namespace = io.of('/ws/v1/indexer-events')
  namespace.on('connection', (socket: Socket) => {
    handle_connection(socket)

    socket.on('disconnect', reason => {
      handle_disconnect(socket, reason)
    })
  })
}
