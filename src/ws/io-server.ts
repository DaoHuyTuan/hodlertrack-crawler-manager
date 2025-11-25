import { Server, Socket } from 'socket.io'
import { setup_crawler_event } from '../events/crawler-events'
import { setup_indexer_events } from '../events/indexer-events'

export const init_socket = (io: Server) => {
  setup_crawler_event(io)
  setup_indexer_events(io)
}
