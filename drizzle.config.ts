import { defineConfig } from "drizzle-kit"
import fs from "node:fs"
import path from "node:path"

// Load .env if present
try {
  const envPath = path.resolve(process.cwd(), ".env")
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath)
  }
} catch {}

const databaseUrl =
  process.env.DATABASE_URL ||
  (process.env.SUPABASE_URL
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_SERVICE_ROLE_KEY || "")}@${new URL(process.env.SUPABASE_URL).hostname}:5432/postgres`
    : "")

export default defineConfig({
  schema: "./server/db/schema/index.js",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  verbose: true,
  strict: true,
})
