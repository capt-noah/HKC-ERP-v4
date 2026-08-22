import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootEnvPath = path.resolve(__dirname, "../.env")

try {
  process.loadEnvFile?.(rootEnvPath)
} catch {
  try {
    process.loadEnvFile?.()
  } catch {
    // Environment files are optional; deployed environments can set vars directly.
  }
}

function normalizeRestUrl(value) {
  const url = value || ""
  return url.endsWith("/") ? url : `${url}/`
}

export const config = {
  port: Number(process.env.PORT || process.env.SERVER_PORT || 1000),
  // Bind to all interfaces by default so Render's load balancer can reach the
  // process. Override to 127.0.0.1 locally if you prefer.
  host: process.env.SERVER_HOST || "0.0.0.0",
  supabaseRestUrl: normalizeRestUrl(process.env.SUPABASE_REST_URL),
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
}

export function assertConfig() {
  if (!config.supabaseRestUrl.includes("/rest/v1/")) {
    throw new Error("SUPABASE_REST_URL must point to the project's /rest/v1/ endpoint.")
  }

  if (!config.supabaseServiceRoleKey && !config.supabasePublishableKey) {
    throw new Error("Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PUBLISHABLE_KEY is required.")
  }
}

