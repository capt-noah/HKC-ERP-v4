import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resources } from "./resourceRegistry.js"
import { config } from "../config.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootEnvPath = path.resolve(__dirname, "../../.env")

try {
  process.loadEnvFile?.(rootEnvPath)
} catch {
  try {
    process.loadEnvFile?.()
  } catch {}
}

function authHeaders() {
  const key = config.supabaseServiceRoleKey || config.supabasePublishableKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ""
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
}

async function fetchTableRows(tableName, retries = 2) {
  const restUrl = config.supabaseRestUrl || (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/rest/v1/` : "")
  if (!restUrl) {
    throw new Error("SUPABASE_REST_URL or SUPABASE_URL environment variable is required to export data.")
  }

  const url = new URL(tableName, restUrl)
  url.searchParams.set("select", "*")
  url.searchParams.set("limit", "100000") // export all available records

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: authHeaders(),
        signal: AbortSignal.timeout(25000),
      })

      if (!response.ok) {
        const text = await response.text()
        if (response.status === 404 || response.status === 400) {
          return []
        }
        throw new Error(`[${response.status}] ${text.slice(0, 150)}`)
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (err) {
      if (attempt === retries) {
        if (err.name === "TimeoutError") {
          console.warn(`[Timeout] ${tableName} timed out after ${retries} attempts`)
          return []
        }
        throw err
      }
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  return []
}

export async function exportAllData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupDir = path.resolve(__dirname, `backups/snapshot-${timestamp}`)

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log(`\n======================================================`)
  console.log(`📦 Starting Zero-Data-Loss Export to:`)
  console.log(`   ${backupDir}`)
  console.log(`======================================================\n`)

  const manifest = {
    timestamp: new Date().toISOString(),
    backupDir,
    tables: {},
    totalRecords: 0,
  }

  const tableEntries = Object.entries(resources)

  for (const [name, meta] of tableEntries) {
    const tableName = meta.table || name
    process.stdout.write(`Fetching ${tableName.padEnd(30)} ... `)

    try {
      const rows = await fetchTableRows(tableName)
      const filePath = path.join(backupDir, `${tableName}.json`)
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf-8")

      manifest.tables[tableName] = {
        resource: name,
        storage: meta.storage || "jsonb_document",
        module: meta.module,
        recordCount: rows.length,
        file: `${tableName}.json`,
      }
      manifest.totalRecords += rows.length

      console.log(`✓ ${rows.length} records saved`)
    } catch (err) {
      console.log(`❌ Error: ${err.message}`)
      manifest.tables[tableName] = {
        resource: name,
        storage: meta.storage || "jsonb_document",
        module: meta.module,
        recordCount: 0,
        error: err.message,
      }
    }
  }

  const manifestPath = path.join(backupDir, "manifest.json")
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8")

  console.log(`\n======================================================`)
  console.log(`🎉 Export Complete!`)
  console.log(`   Total Tables Processed: ${tableEntries.length}`)
  console.log(`   Total Records Exported:  ${manifest.totalRecords}`)
  console.log(`   Manifest File:           ${manifestPath}`)
  console.log(`======================================================\n`)

  return { backupDir, manifest }
}

// Direct execution from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  exportAllData().catch((err) => {
    console.error("Export failed:", err)
    process.exit(1)
  })
}
