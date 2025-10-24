import { eq, desc } from "drizzle-orm";
import { db } from "../db/connection";
import { tokens } from "../db/schema";
import { NewToken, Token, TokenCreateData } from "../types/token";

// Create a new token
export async function createToken(tokenData: TokenCreateData): Promise<Token> {
  try {
    return await db.transaction(async (tx) => {
      const newToken: NewToken = {
        id: tokenData.id,
        name: tokenData.name,
        address: tokenData.address,
        chain: tokenData.chain,
        digit: tokenData.digit,
        blockDeploy: tokenData.blockDeploy
          ? BigInt(tokenData.blockDeploy)
          : null,
      };

      const [createdToken] = await tx
        .insert(tokens)
        .values(newToken)
        .returning();
      return createdToken;
    });
  } catch (error) {
    console.error("Error creating token:", error);
    throw new Error(
      `Failed to create token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get token by ID
export async function getTokenById(id: string): Promise<Token | null> {
  try {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token || null;
  } catch (error) {
    console.error("Error getting token by ID:", error);
    throw new Error(
      `Failed to get token by ID: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get token by address
export async function getTokenByAddress(
  address: string
): Promise<Token | null> {
  try {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.address, address));
    return token || null;
  } catch (error) {
    console.error("Error getting token by address:", error);
    throw new Error(
      `Failed to get token by address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get all tokens
export async function getAllTokens(limit = 100, offset = 0): Promise<Token[]> {
  try {
    return await db
      .select()
      .from(tokens)
      .orderBy(desc(tokens.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting all tokens:", error);
    throw new Error(
      `Failed to get all tokens: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get tokens by chain
export async function getTokensByChain(
  chain: string,
  limit = 100,
  offset = 0
): Promise<Token[]> {
  try {
    return await db
      .select()
      .from(tokens)
      .where(eq(tokens.chain, chain))
      .orderBy(desc(tokens.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting tokens by chain:", error);
    throw new Error(
      `Failed to get tokens by chain: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Update token
export async function updateToken(
  id: string,
  updates: Partial<Omit<NewToken, "id">>
): Promise<Token | null> {
  try {
    return await db.transaction(async (tx) => {
      const [updatedToken] = await tx
        .update(tokens)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tokens.id, id))
        .returning();

      return updatedToken || null;
    });
  } catch (error) {
    console.error("Error updating token:", error);
    throw new Error(
      `Failed to update token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Delete token
export async function deleteToken(id: string): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const result = await tx
        .delete(tokens)
        .where(eq(tokens.id, id))
        .returning({ id: tokens.id });
      return result.length > 0;
    });
  } catch (error) {
    console.error("Error deleting token:", error);
    throw new Error(
      `Failed to delete token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Check if token exists by address
export async function tokenExistsByAddress(address: string): Promise<boolean> {
  try {
    const [token] = await db
      .select({ id: tokens.id })
      .from(tokens)
      .where(eq(tokens.address, address));
    return !!token;
  } catch (error) {
    console.error("Error checking if token exists by address:", error);
    throw new Error(
      `Failed to check if token exists by address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
