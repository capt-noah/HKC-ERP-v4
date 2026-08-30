import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema/index.js"
import { config } from "../config.js"

const { Pool } = pg

function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  const supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL
  const supabaseKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const hostname = new URL(supabaseUrl).hostname
      return `postgresql://postgres:${encodeURIComponent(supabaseKey)}@${hostname}:5432/postgres`
    } catch {
      // Fallback
    }
  }

  return "postgresql://postgres:postgres@localhost:5432/postgres"
}

// Node-postgres connection pool
export const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: getConnectionString().includes("supabase") ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
})

// Unified type-safe Drizzle database client
export const db = drizzle(pool, { schema })

export default db
