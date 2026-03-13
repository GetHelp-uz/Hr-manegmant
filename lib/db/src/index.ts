import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
  allowExitOnIdle: true,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("Unexpected idle client error (pool):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
