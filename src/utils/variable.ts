import { DockerConfig } from '../services/docker-service'

export const NETWORK_NAME: string = 'hodler-network'
export const CRAWLER_IMAGE: string = 'crawler_image'
export const SERVER_WEBSOCKET_URL: string = 'server_websocket_url'
export const TOKEN_ID: string = 'token_id'
export const TOKEN_ADDRESS: string = 'address'
export const TOKEN_NAME: string = 'token_name'
export const TOKEN_SYMBOL: string = 'token_symbol'

// Socket.IO event names

export const CRAWLER_EVENT_TYPE = {
  CREATE: 'create-crawler',
  TRANSACTIONS_DATA_NEW: 'transactions:data:new'
}

export const CRAWLER_EVENTS = {
  COMMAND: 'crawler:command',
  EVENTS: 'crawler:events',
  DISCONNECT: 'crawler:disconnect'
}

export const SOCKET_ROOMS = {
  CRAWLER: 'crawlers'
}
