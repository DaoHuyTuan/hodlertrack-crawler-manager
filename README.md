# HodlerTrack Crawler

A Node.js application built with TypeScript, PostgreSQL, and Drizzle ORM for tracking cryptocurrency tokens, transactions, and crawlers.

## Features

- **Token Management**: Store and manage token information including name, address, chain, digits, and deployment block
- **Transaction Tracking**: Record and query blockchain transactions with hash, from/to addresses, and values
- **Crawler Management**: Manage crawler instances with online/offline status and token associations
- **TypeScript**: Full type safety throughout the application
- **Drizzle ORM**: Modern ORM with excellent TypeScript support
- **PostgreSQL**: Robust database for storing blockchain data

## Database Schema

### Tokens Table

- `id`: Unique token identifier
- `name`: Token name
- `address`: Contract address
- `chain`: Blockchain network
- `digit`: Token decimals
- `block_deploy`: Deployment block number
- `created_at`, `updated_at`: Timestamps

### Transactions Table

- `id`: Unique transaction identifier
- `hash`: Transaction hash
- `from`: Sender address
- `to`: Recipient address
- `value`: Transaction value
- `block_hash`: Block hash
- `created_at`, `updated_at`: Timestamps

### Crawlers Table

- `id`: Unique crawler identifier
- `name`: Crawler name
- `token`: Token symbol
- `address`: Crawler address
- `is_online`: Online status
- `token_id`: Reference to tokens table
- `created_at`, `updated_at`: Timestamps

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hodlertrack-crawler
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.example .env
```

Edit `.env` file with your database configuration:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/hodlertrack_db
PORT=3000
NODE_ENV=development
```

4. Generate and run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

## Usage

### Development

```bash
npm run dev
```

### Build and Run

```bash
npm run build
npm start
```

### Database Operations

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

## Services

### TokenService

- `createToken(tokenData)`: Create a new token
- `getTokenById(id)`: Get token by ID
- `getTokenByAddress(address)`: Get token by contract address
- `getAllTokens(limit, offset)`: Get all tokens with pagination
- `getTokensByChain(chain)`: Get tokens by blockchain
- `updateToken(id, updates)`: Update token information
- `deleteToken(id)`: Delete a token

### TransactionService

- `createTransaction(transactionData)`: Create a new transaction
- `createTransactions(transactionDataList)`: Create multiple transactions
- `getTransactionById(id)`: Get transaction by ID
- `getTransactionByHash(hash)`: Get transaction by hash
- `getTransactionsByAddress(address)`: Get transactions for an address
- `getTransactionsFrom(fromAddress)`: Get outgoing transactions
- `getTransactionsTo(toAddress)`: Get incoming transactions

### CrawlerService

- `createCrawler(crawlerData)`: Create a new crawler
- `getCrawlerById(id)`: Get crawler by ID
- `getCrawlerWithToken(id)`: Get crawler with token information
- `getAllCrawlers(limit, offset)`: Get all crawlers
- `getCrawlersByTokenId(tokenId)`: Get crawlers for a token
- `getOnlineCrawlers()`: Get online crawlers
- `setCrawlerOnlineStatus(id, isOnline)`: Update crawler status

## Example Usage

```typescript
import { tokenService, transactionService, crawlerService } from "./src";

// Create a token
const token = await tokenService.createToken({
  id: "token-1",
  name: "Bitcoin",
  address: "0x1234567890abcdef",
  chain: "ethereum",
  digit: 18,
  blockDeploy: "12345678",
});

// Create a transaction
const transaction = await transactionService.createTransaction({
  id: "0xfcf01af9b1461899d018ba21ce836197b28ead21c6c654e6f504419495cb5122",
  hash: "0xfcf01af9b1461899d018ba21ce836197b28ead21c6c654e6f504419495cb5122",
  from: "0x9adea960e2e41725fff6f0951c790bd6257dfb68",
  to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  value: "13695893495720796",
  blockHash:
    "0x8a0c1b0b8765fd5f87781c9187d8b2a81122aac3519d5fe4bddb7caa7802ff3a",
});

// Create a crawler
const crawler = await crawlerService.createCrawler({
  id: "crawler-1",
  name: "Bitcoin Crawler",
  token: "BTC",
  address: "0x1234567890abcdef",
  isOnline: true,
  tokenId: "token-1",
});
```

## Technologies Used

- **Node.js**: Runtime environment
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Database
- **Drizzle ORM**: Database ORM
- **tsx**: TypeScript execution for development

## License

MIT
