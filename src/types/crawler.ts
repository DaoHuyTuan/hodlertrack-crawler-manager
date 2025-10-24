import { crawlers } from "../db/schema";

export type Crawler = typeof crawlers.$inferSelect;
export type NewCrawler = typeof crawlers.$inferInsert;

export interface CrawlerCreateData {
  id: string;
  name: string;
  token: string;
  address: string;
  isOnline?: boolean;
  tokenId: string;
}
