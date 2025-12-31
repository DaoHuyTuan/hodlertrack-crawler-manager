import { Server, Socket } from 'socket.io'
import { handle_connection, handle_disconnect } from './general'
import {
  CRAWLER_EVENTS,
  SOCKET_ROOMS,
  CRAWLER_EVENT_TYPE
} from '../utils/variable'
import { create_crawler } from '../services/crawler-services'

interface Message {
  type: string
  data: any
}

export const handle_crawler_events = (socket: Socket, message: Message) => {
  const { type, data } = message
  console.log('message', message)
  switch (type) {
    case CRAWLER_EVENT_TYPE.CREATE:
      break
    case CRAWLER_EVENT_TYPE.TRANSACTIONS_DATA_NEW:
      console.log('transactions data new', data)
      break
    default:
      console.log('Unknown message type:', type)
      socket.emit('error', {
        success: false,
        message: `Unknown message type: ${type}`,
        timestamp: new Date()
      })
  }
}

export const setup_crawler_event = (io: Server) => {
  const crawler_namespace = io.of('/ws/v1/crawler-events')
  // crawler_namespace.socketsJoin(SOCKET_ROOMS.CRAWLER)
  crawler_namespace.on('connection', (socket: Socket) => {
    handle_connection(socket)
    socket.on(CRAWLER_EVENTS.EVENTS, (data: Message) => {
      handle_crawler_events(socket, data)
    })

    // socket.on(CRAWLER_EVENTS.COMMAND, (data: Message) => {})
    socket.on(CRAWLER_EVENTS.DISCONNECT, (reason: string) => {
      handle_disconnect(socket, reason)
    })
  })
}
