import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

if (!hasDatabaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL must be set in production.");
}

if (!hasDatabaseUrl) {
  console.warn("[db] DATABASE_URL is not set. Running in degraded mode (development only).");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
