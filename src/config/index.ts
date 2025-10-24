import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'hodler',
    password: process.env.DB_PASSWORD || '123123',
    name: process.env.DB_NAME || 'hodler'
  },
  websocket: {
    url: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
    pingInterval: parseInt(process.env.PING_INTERVAL || '30000', 10), // 30 seconds default
    pingTimeout: parseInt(process.env.PING_TIMEOUT || '60000', 10) // 60 seconds default (1 minute)
  },
  // Construct database URL from individual components
  get databaseUrl() {
    return `postgresql://${this.database.user}:${this.database.password}@${this.database.host}:${this.database.port}/${this.database.name}`
  }
} as const

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.warn(
    `Warning: Missing environment variables: ${missingVars.join(
      ', '
    )}, using default values`
  )
}
