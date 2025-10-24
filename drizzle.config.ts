import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

// Construct database URL from environment variables
const getDatabaseUrl = () => {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USER || "hodler";
  const password = process.env.DB_PASSWORD || "123123";
  const database = process.env.DB_NAME || "hodler";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: getDatabaseUrl(),
  },
} satisfies Config;
