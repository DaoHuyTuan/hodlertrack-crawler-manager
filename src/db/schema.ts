import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  bigint,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Tokens table
export const tokens = pgTable("tokens", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull().unique(),
  chain: varchar("chain", { length: 100 }).notNull(),
  digit: integer("digit").notNull(),
  blockDeploy: bigint("block_deploy", { mode: "bigint" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  hash: varchar("hash", { length: 255 }).notNull().unique(),
  from: varchar("from", { length: 255 }).notNull(),
  to: varchar("to", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(), // Using varchar to handle large numbers
  blockHash: varchar("block_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Crawlers table
export const crawlers = pgTable("crawlers", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  tokenId: varchar("token_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const crawlersRelations = relations(crawlers, ({ one }) => ({
  tokenRef: one(tokens, {
    fields: [crawlers.tokenId],
    references: [tokens.id],
  }),
}));

export const tokensRelations = relations(tokens, ({ many }) => ({
  crawlers: many(crawlers),
}));
