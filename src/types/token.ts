import { tokens } from "../db/schema";

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;

export interface TokenCreateData {
  id: string;
  name: string;
  address: string;
  chain: string;
  digit: number;
  blockDeploy?: string;
}
