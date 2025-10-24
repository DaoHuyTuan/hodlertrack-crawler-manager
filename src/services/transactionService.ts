import { eq, desc, and, or } from "drizzle-orm";
import { db } from "../db/connection";
import { transactions } from "../db/schema";
import type { Transaction, NewTransaction, TransactionData } from "../types";

// Create a new transaction
export async function createTransaction(
  transactionData: TransactionData
): Promise<Transaction> {
  try {
    return await db.transaction(async (tx) => {
      const newTransaction: NewTransaction = {
        id: transactionData.id,
        hash: transactionData.hash,
        from: transactionData.from,
        to: transactionData.to,
        value: transactionData.value,
        blockHash: transactionData.blockHash,
      };

      const [createdTransaction] = await tx
        .insert(transactions)
        .values(newTransaction)
        .returning();
      return createdTransaction;
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error(
      `Failed to create transaction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Create multiple transactions
export async function createTransactions(
  transactionDataList: TransactionData[]
): Promise<Transaction[]> {
  try {
    return await db.transaction(async (tx) => {
      const newTransactions: NewTransaction[] = transactionDataList.map(
        (data) => ({
          id: data.id,
          hash: data.hash,
          from: data.from,
          to: data.to,
          value: data.value,
          blockHash: data.blockHash,
        })
      );

      return await tx.insert(transactions).values(newTransactions).returning();
    });
  } catch (error) {
    console.error("Error creating transactions:", error);
    throw new Error(
      `Failed to create transactions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transaction by ID
export async function getTransactionById(
  id: string
): Promise<Transaction | null> {
  try {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction || null;
  } catch (error) {
    console.error("Error getting transaction by ID:", error);
    throw new Error(
      `Failed to get transaction by ID: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transaction by hash
export async function getTransactionByHash(
  hash: string
): Promise<Transaction | null> {
  try {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.hash, hash));
    return transaction || null;
  } catch (error) {
    console.error("Error getting transaction by hash:", error);
    throw new Error(
      `Failed to get transaction by hash: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get all transactions
export async function getAllTransactions(
  limit = 100,
  offset = 0
): Promise<Transaction[]> {
  try {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting all transactions:", error);
    throw new Error(
      `Failed to get all transactions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transactions by address (from or to)
export async function getTransactionsByAddress(
  address: string,
  limit = 100,
  offset = 0
): Promise<Transaction[]> {
  try {
    return await db
      .select()
      .from(transactions)
      .where(or(eq(transactions.from, address), eq(transactions.to, address)))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting transactions by address:", error);
    throw new Error(
      `Failed to get transactions by address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transactions from specific address
export async function getTransactionsFrom(
  fromAddress: string,
  limit = 100,
  offset = 0
): Promise<Transaction[]> {
  try {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.from, fromAddress))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting transactions from address:", error);
    throw new Error(
      `Failed to get transactions from address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transactions to specific address
export async function getTransactionsTo(
  toAddress: string,
  limit = 100,
  offset = 0
): Promise<Transaction[]> {
  try {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.to, toAddress))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting transactions to address:", error);
    throw new Error(
      `Failed to get transactions to address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transactions between two addresses
export async function getTransactionsBetween(
  fromAddress: string,
  toAddress: string,
  limit = 100,
  offset = 0
): Promise<Transaction[]> {
  try {
    return await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.from, fromAddress), eq(transactions.to, toAddress))
      )
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting transactions between addresses:", error);
    throw new Error(
      `Failed to get transactions between addresses: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Check if transaction exists by hash
export async function transactionExistsByHash(hash: string): Promise<boolean> {
  try {
    const [transaction] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.hash, hash));
    return !!transaction;
  } catch (error) {
    console.error("Error checking if transaction exists by hash:", error);
    throw new Error(
      `Failed to check if transaction exists by hash: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Update transaction
export async function updateTransaction(
  id: string,
  updates: Partial<Omit<NewTransaction, "id">>
): Promise<Transaction | null> {
  try {
    return await db.transaction(async (tx) => {
      const [updatedTransaction] = await tx
        .update(transactions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(transactions.id, id))
        .returning();

      return updatedTransaction || null;
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw new Error(
      `Failed to update transaction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Delete transaction
export async function deleteTransaction(id: string): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const result = await tx
        .delete(transactions)
        .where(eq(transactions.id, id))
        .returning({ id: transactions.id });
      return result.length > 0;
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw new Error(
      `Failed to delete transaction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get transaction count by address
export async function getTransactionCountByAddress(
  address: string
): Promise<number> {
  try {
    const result = await db
      .select({ count: transactions.id })
      .from(transactions)
      .where(or(eq(transactions.from, address), eq(transactions.to, address)));

    return result.length;
  } catch (error) {
    console.error("Error getting transaction count by address:", error);
    throw new Error(
      `Failed to get transaction count by address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
