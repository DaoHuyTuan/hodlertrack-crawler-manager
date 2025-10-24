import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "../config";

// Create the connection
const queryClient = postgres(config.databaseUrl);

// Create the database instance
export const db = drizzle(queryClient, { schema });

// Export the query client for manual queries if needed
export { queryClient };
