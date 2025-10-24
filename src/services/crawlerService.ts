import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/connection'

import { Crawler, CrawlerCreateData, NewCrawler } from '../types/crawler'
import { crawlers, tokens } from '../db/schema'
import { Token } from '../types/token'

// Create a new crawler
export async function createCrawler(
  crawlerData: CrawlerCreateData
): Promise<Crawler> {
  try {
    return await db.transaction(async tx => {
      const newCrawler: NewCrawler = {
        id: crawlerData.id,
        name: crawlerData.name,
        token: crawlerData.token,
        address: crawlerData.address,
        isOnline: crawlerData.isOnline || false,
        tokenId: crawlerData.tokenId
      }

      const [createdCrawler] = await tx
        .insert(crawlers)
        .values(newCrawler)
        .returning()
      return createdCrawler
    })
  } catch (error) {
    console.error('Error creating crawler:', error)
    throw new Error(
      `Failed to create crawler: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get crawler by ID
export async function getCrawlerById(id: string): Promise<Crawler | null> {
  try {
    const [crawler] = await db
      .select()
      .from(crawlers)
      .where(eq(crawlers.id, id))
    return crawler || null
  } catch (error) {
    console.error('Error getting crawler by ID:', error)
    throw new Error(
      `Failed to get crawler by ID: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get crawler with token information
export async function getCrawlerWithToken(
  id: string
): Promise<(Crawler & { tokenInfo?: Token }) | null> {
  try {
    const result = await db
      .select({
        crawler: crawlers,
        tokenInfo: tokens
      })
      .from(crawlers)
      .leftJoin(tokens, eq(crawlers.tokenId, tokens.id))
      .where(eq(crawlers.id, id))

    if (result.length === 0) return null

    const { crawler, tokenInfo } = result[0]
    return {
      ...crawler,
      tokenInfo: tokenInfo || undefined
    }
  } catch (error) {
    console.error('Error getting crawler with token:', error)
    throw new Error(
      `Failed to get crawler with token: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get all crawlers
export async function getAllCrawlers(
  limit = 100,
  offset = 0
): Promise<Crawler[]> {
  try {
    return await db
      .select()
      .from(crawlers)
      .orderBy(desc(crawlers.createdAt))
      .limit(limit)
      .offset(offset)
  } catch (error) {
    console.error('Error getting all crawlers:', error)
    throw new Error(
      `Failed to get all crawlers: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get all crawlers with token information
export async function getAllCrawlersWithTokens(
  limit = 100,
  offset = 0
): Promise<(Crawler & { tokenInfo?: Token })[]> {
  try {
    const result = await db
      .select({
        crawler: crawlers,
        tokenInfo: tokens
      })
      .from(crawlers)
      .leftJoin(tokens, eq(crawlers.tokenId, tokens.id))
      .orderBy(desc(crawlers.createdAt))
      .limit(limit)
      .offset(offset)

    return result.map(({ crawler, tokenInfo }) => ({
      ...crawler,
      tokenInfo: tokenInfo || undefined
    }))
  } catch (error) {
    console.error('Error getting all crawlers with tokens:', error)
    throw new Error(
      `Failed to get all crawlers with tokens: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get crawlers by token ID
export async function getCrawlersByTokenId(
  tokenId: string,
  limit = 100,
  offset = 0
): Promise<Crawler[]> {
  try {
    return await db
      .select()
      .from(crawlers)
      .where(eq(crawlers.tokenId, tokenId))
      .orderBy(desc(crawlers.createdAt))
      .limit(limit)
      .offset(offset)
  } catch (error) {
    console.error('Error getting crawlers by token ID:', error)
    throw new Error(
      `Failed to get crawlers by token ID: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get online crawlers
export async function getOnlineCrawlers(
  limit = 100,
  offset = 0
): Promise<Crawler[]> {
  try {
    return await db
      .select()
      .from(crawlers)
      .where(eq(crawlers.isOnline, true))
      .orderBy(desc(crawlers.createdAt))
      .limit(limit)
      .offset(offset)
  } catch (error) {
    console.error('Error getting online crawlers:', error)
    throw new Error(
      `Failed to get online crawlers: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get offline crawlers
export async function getOfflineCrawlers(
  limit = 100,
  offset = 0
): Promise<Crawler[]> {
  try {
    return await db
      .select()
      .from(crawlers)
      .where(eq(crawlers.isOnline, false))
      .orderBy(desc(crawlers.createdAt))
      .limit(limit)
      .offset(offset)
  } catch (error) {
    console.error('Error getting offline crawlers:', error)
    throw new Error(
      `Failed to get offline crawlers: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Update crawler
export async function updateCrawler(
  id: string,
  updates: Partial<Omit<NewCrawler, 'id'>>
): Promise<Crawler | null> {
  try {
    return await db.transaction(async tx => {
      const [updatedCrawler] = await tx
        .update(crawlers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crawlers.id, id))
        .returning()

      return updatedCrawler || null
    })
  } catch (error) {
    console.error('Error updating crawler:', error)
    throw new Error(
      `Failed to update crawler: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Set crawler online status
export async function setCrawlerOnlineStatus(
  id: string,
  isOnline: boolean
): Promise<Crawler | null> {
  try {
    return await updateCrawler(id, { isOnline })
  } catch (error) {
    console.error('Error setting crawler online status:', error)
    throw new Error(
      `Failed to set crawler online status: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Delete crawler
export async function deleteCrawler(id: string): Promise<boolean> {
  try {
    return await db.transaction(async tx => {
      const result = await tx
        .delete(crawlers)
        .where(eq(crawlers.id, id))
        .returning({ id: crawlers.id })
      return result.length > 0
    })
  } catch (error) {
    console.error('Error deleting crawler:', error)
    throw new Error(
      `Failed to delete crawler: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Check if crawler exists by name and token
export async function crawlerExistsByNameAndToken(
  name: string,
  tokenId: string
): Promise<boolean> {
  try {
    const [crawler] = await db
      .select({ id: crawlers.id })
      .from(crawlers)
      .where(and(eq(crawlers.name, name), eq(crawlers.tokenId, tokenId)))
    return !!crawler
  } catch (error) {
    console.error('Error checking if crawler exists by name and token:', error)
    throw new Error(
      `Failed to check if crawler exists by name and token: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get crawler count by token
export async function getCrawlerCountByToken(tokenId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: crawlers.id })
      .from(crawlers)
      .where(eq(crawlers.tokenId, tokenId))

    return result.length
  } catch (error) {
    console.error('Error getting crawler count by token:', error)
    throw new Error(
      `Failed to get crawler count by token: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Get online crawler count
export async function getOnlineCrawlerCount(): Promise<number> {
  try {
    const result = await db
      .select({ count: crawlers.id })
      .from(crawlers)
      .where(eq(crawlers.isOnline, true))

    return result.length
  } catch (error) {
    console.error('Error getting online crawler count:', error)
    throw new Error(
      `Failed to get online crawler count: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Set crawler online
export async function setCrawlerOnline(id: string): Promise<Crawler | null> {
  try {
    return await setCrawlerOnlineStatus(id, true)
  } catch (error) {
    console.error('Error setting crawler online:', error)
    throw new Error(
      `Failed to set crawler online: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// Set crawler offline
export async function setCrawlerOffline(id: string): Promise<Crawler | null> {
  try {
    return await setCrawlerOnlineStatus(id, false)
  } catch (error) {
    console.error('Error setting crawler offline:', error)
    throw new Error(
      `Failed to set crawler offline: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}
