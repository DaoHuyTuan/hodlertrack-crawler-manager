import { transactions } from "../db/schema";

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export interface TransactionData {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  blockHash: string;
}
