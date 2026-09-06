import "server-only";
import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

/**
 * Central MariaDB/MySQL connection pool.
 *
 * This module must never be imported from a Client Component — the
 * `server-only` import above makes that a build-time error if it happens
 * by accident.
 *
 * Credentials are read exclusively from environment variables and are
 * never hard-coded. They must never be exposed via NEXT_PUBLIC_* vars.
 */

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to ` +
        `.env.local and fill in real database credentials.`
    );
  }
  return value;
}

function createPool(): Pool {
  const options: PoolOptions = {
    host: readRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? "3306"),
    database: readRequiredEnv("DB_NAME"),
    user: readRequiredEnv("DB_USER"),
    password: readRequiredEnv("DB_PASSWORD"),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    queueLimit: 0,
    // Return DECIMAL columns (e.g. price) as JS numbers instead of strings.
    decimalNumbers: true,
    // Return DATE/DATETIME/TIMESTAMP columns as plain strings so they can be
    // passed straight from Server Components without extra serialization.
    dateStrings: true,
  };

  return mysql.createPool(options);
}

// In dev mode, Next.js hot-reloads server modules, which would otherwise
// create a fresh pool (and a fresh set of TCP connections) on every edit.
// Stashing the pool on `globalThis` keeps a single pool alive across reloads.
const globalForDb = globalThis as unknown as { aartversePool?: Pool };

export const pool: Pool = globalForDb.aartversePool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.aartversePool = pool;
}

/**
 * Run a parameterized query and get back typed rows.
 *
 * Always pass user-controlled values through `params` — never interpolate
 * them into the SQL string itself.
 */
export async function query<T = unknown>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<T[]> {
  const [rows] = await pool.query(sql, params as unknown[]);
  return rows as T[];
}

/**
 * Run a parameterized query and return only the first row, or null if the
 * query returned no rows.
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
