const DEFAULT_SUPABASE_REST_URL = "https://hutzzxwkzfnwiafnnwpl.supabase.co/rest/v1/"
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qQtl8eY08iX_MSOfWQXXcQ_97nZYK-N"

try {
  process.loadEnvFile?.()
} catch {
  // Environment files are optional; deployed environments can set vars directly.
}

function normalizeRestUrl(value) {
  const url = value || DEFAULT_SUPABASE_REST_URL
  return url.endsWith("/") ? url : `${url}/`
}

export const config = {
  port: Number(process.env.PORT || process.env.SERVER_PORT || 8787),
  host: process.env.SERVER_HOST || "127.0.0.1",
  supabaseRestUrl: normalizeRestUrl(process.env.SUPABASE_REST_URL),
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
}

export function assertConfig() {
  if (!config.supabaseRestUrl.includes("/rest/v1/")) {
    throw new Error("SUPABASE_REST_URL must point to the project's /rest/v1/ endpoint.")
  }

  if (!config.supabasePublishableKey) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY is required.")
  }
}
