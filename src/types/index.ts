export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Database types
export interface Token {
  id: string;
  name: string;
  address: string;
  chain: string;
  digit: number;
  blockDeploy: bigint | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewToken {
  id: string;
  name: string;
  address: string;
  chain: string;
  digit: number;
  blockDeploy: bigint | null;
}

export interface TokenCreateData {
  id: string;
  name: string;
  address: string;
  chain: string;
  digit: number;
  blockDeploy?: string;
}

export interface TokenUpdateData {
  name?: string;
  address?: string;
  chain?: string;
  digit?: number;
  blockDeploy?: string;
}

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  blockHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  blockHash: string;
}

export interface TransactionData {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  blockHash: string;
}

export interface TransactionUpdateData {
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
  blockHash?: string;
}

export interface Crawler {
  id: string;
  name: string;
  token: string;
  address: string;
  isOnline: boolean;
  tokenId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCrawler {
  id: string;
  name: string;
  token: string;
  address: string;
  isOnline: boolean;
  tokenId: string;
}

export interface CrawlerCreateData {
  id: string;
  name: string;
  token: string;
  address: string;
  isOnline?: boolean;
  tokenId: string;
}

export interface CrawlerUpdateData {
  name?: string;
  token?: string;
  address?: string;
  isOnline?: boolean;
  tokenId?: string;
}
