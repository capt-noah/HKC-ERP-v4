import { db, pool } from "./client.js"
import * as schema from "./schema/index.js"
import { eq, desc, sql } from "drizzle-orm"
import { config } from "../config.js"
import crypto from "node:crypto"

// Master mapping from resource table name to Drizzle schema table object
export const tableMap = {
  // Inventory (4)
  warehouses: schema.warehouses,
  inventory_products: schema.inventoryProducts,
  stock_movements: schema.stockMovements,
  store_transfers: schema.storeTransfers,

  // Sales & Purchasing (7)
  customers: schema.customers,
  suppliers: schema.suppliers,
  sales_orders: schema.salesOrders,
  purchase_orders: schema.purchaseOrders,
  sales_issues: schema.salesIssues,
  sales_issue_items: schema.salesIssueItems,
  processing_services: schema.processingServices,
  shipment_documents: schema.shipmentDocuments,
  hkc_doc_records: schema.hkcDocRecords,

  // Finance & GL (10)
  company_settings: schema.companySettings,
  chart_of_accounts: schema.chartOfAccounts,
  journal_entries: schema.journalEntries,
  journal_entry_lines: schema.journalEntryLines,
  invoices: schema.invoices,
  payments: schema.payments,
  expenses: schema.expenses,
  recurring_expense_schedules: schema.recurringExpenseSchedules,
  vehicles: schema.vehicles,
  tax_rules: schema.taxRules,

  // HR & Payroll (6)
  employees: schema.employees,
  attendance_records: schema.attendanceRecords,
  payroll_periods: schema.payrollPeriods,
  payroll_records: schema.payrollRecords,
  leave_types: schema.leaveTypes,
  leave_requests: schema.leaveRequests,

  // Admin (2)
  users: schema.users,
  user_activity_logs: schema.userActivityLogs,
}

export function getDrizzleTable(tableName) {
  return tableMap[tableName] || null
}

function authHeaders(prefer) {
  const key = config.supabaseServiceRoleKey || config.supabasePublishableKey
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
  if (prefer) headers.Prefer = prefer
  return headers
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function unwrapRow(row, storage) {
  if (!row) return null
  if (storage === "jsonb_document") {
    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : (row.payload || {})
    return { id: row.id, ...payload }
  }
  return row
}

// ── Generic Drizzle CRUD Methods (Works with Direct Pool or Supabase PostgREST) ──

export async function drizzleListRows({ resource, query = {} }) {
  const table = getDrizzleTable(resource.table)
  if (!table) {
    return { status: 404, body: { error: `Table '${resource.table}' not found in Drizzle schema.` } }
  }

  // 1. Try direct Drizzle ORM via TCP Pool if configured
  if (process.env.DATABASE_URL) {
    try {
      let q = db.select().from(table)
      if (table.createdAt) q = q.orderBy(desc(table.createdAt))
      if (query.limit) q = q.limit(parseInt(query.limit, 10))
      if (query.offset) q = q.offset(parseInt(query.offset, 10))
      const rows = await q
      return { status: 200, body: rows.map((r) => unwrapRow(r, resource.storage)) }
    } catch (err) {
      console.warn(`[DRIZZLE POOL FALLBACK] ${resource.table}:`, err.message)
    }
  }

  // 2. Query through PostgREST endpoint
  try {
    const url = new URL(resource.table, config.supabaseRestUrl)
    url.searchParams.set("select", resource.storage === "jsonb_document" ? "id,payload" : "*")
    url.searchParams.set("order", "created_at.desc")
    for (const [k, v] of Object.entries(query)) {
      if (k !== "select") url.searchParams.set(k, v)
    }

    const response = await fetch(url, { headers: authHeaders() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows)) {
      return { status: 200, body: rows.map((r) => unwrapRow(r, resource.storage)) }
    }
    return { status: response.status || 500, body: rows || [] }
  } catch (err) {
    return { status: 500, body: { error: `Failed to list ${resource.table}`, message: err.message } }
  }
}

export async function drizzleGetRow({ resource, id }) {
  const table = getDrizzleTable(resource.table)
  if (!table) {
    return { status: 404, body: { error: `Table '${resource.table}' not found in Drizzle schema.` } }
  }

  if (process.env.DATABASE_URL) {
    try {
      const rows = await db.select().from(table).where(eq(table.id, id)).limit(1)
      if (rows.length > 0) {
        return { status: 200, body: unwrapRow(rows[0], resource.storage) }
      }
      return { status: 404, body: { error: `Row '${id}' not found in ${resource.table}.` } }
    } catch (err) {
      console.warn(`[DRIZZLE POOL GET FALLBACK] ${resource.table}:${id}:`, err.message)
    }
  }

  try {
    const url = new URL(resource.table, config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    url.searchParams.set("select", resource.storage === "jsonb_document" ? "id,payload" : "*")
    const response = await fetch(url, { headers: authHeaders() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: unwrapRow(rows[0], resource.storage) }
    }
    return { status: 404, body: { error: `Row '${id}' not found in ${resource.table}.` } }
  } catch (err) {
    return { status: 500, body: { error: `Failed to get ${resource.table}:${id}`, message: err.message } }
  }
}

export async function drizzleCreateRow({ resource, body }) {
  const table = getDrizzleTable(resource.table)
  if (!table) {
    return { status: 404, body: { error: `Table '${resource.table}' not found in Drizzle schema.` } }
  }

  const id = body?.id ? String(body.id) : crypto.randomUUID()
  const payloadData = resource.storage === "jsonb_document" ? (body?.payload || body) : body

  if (process.env.DATABASE_URL) {
    try {
      const insertValues = resource.storage === "jsonb_document"
        ? { id, payload: payloadData, createdAt: new Date(), updatedAt: new Date() }
        : { ...body, id, createdAt: new Date(), updatedAt: new Date() }

      const inserted = await db.insert(table).values(insertValues).returning()
      return { status: 200, body: unwrapRow(inserted[0] || insertValues, resource.storage) }
    } catch (err) {
      console.warn(`[DRIZZLE POOL CREATE FALLBACK] ${resource.table}:`, err.message)
    }
  }

  try {
    const url = new URL(resource.table, config.supabaseRestUrl)
    const postBody = resource.storage === "jsonb_document"
      ? { id, payload: payloadData }
      : { id, ...body }

    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(postBody),
    })

    const rows = await parseResponse(response)
    if (response.ok) {
      const doc = Array.isArray(rows) && rows.length > 0 ? rows[0] : postBody
      return { status: 200, body: unwrapRow(doc, resource.storage) }
    }
    return { status: response.status || 500, body: rows }
  } catch (err) {
    return { status: 500, body: { error: `Failed to create in ${resource.table}`, message: err.message } }
  }
}

export async function drizzleUpdateRow({ resource, id, body }) {
  const table = getDrizzleTable(resource.table)
  if (!table) {
    return { status: 404, body: { error: `Table '${resource.table}' not found in Drizzle schema.` } }
  }

  if (process.env.DATABASE_URL) {
    try {
      let updateValues
      if (resource.storage === "jsonb_document") {
        const existing = await db.select().from(table).where(eq(table.id, id)).limit(1)
        const existingPayload = existing.length > 0
          ? (typeof existing[0].payload === "string" ? JSON.parse(existing[0].payload) : (existing[0].payload || {}))
          : {}
        updateValues = { payload: { ...existingPayload, ...body }, updatedAt: new Date() }
      } else {
        updateValues = { ...body, updatedAt: new Date() }
      }

      const updated = await db.update(table).set(updateValues).where(eq(table.id, id)).returning()
      return { status: 200, body: unwrapRow(updated[0] || { id, ...updateValues }, resource.storage) }
    } catch (err) {
      console.warn(`[DRIZZLE POOL UPDATE FALLBACK] ${resource.table}:${id}:`, err.message)
    }
  }

  try {
    const url = new URL(resource.table, config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)

    let patchBody
    if (resource.storage === "jsonb_document") {
      const getRes = await drizzleGetRow({ resource, id })
      const existing = getRes.body || {}
      const { id: _ignoredId, ...patchData } = body || {}
      patchBody = { payload: { ...existing, ...patchData } }
    } else {
      patchBody = body
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: authHeaders("return=representation"),
      body: JSON.stringify(patchBody),
    })

    const rows = await parseResponse(response)
    if (response.ok) {
      const doc = Array.isArray(rows) && rows.length > 0 ? rows[0] : { id, ...patchBody }
      return { status: 200, body: unwrapRow(doc, resource.storage) }
    }
    return { status: response.status || 500, body: rows }
  } catch (err) {
    return { status: 500, body: { error: `Failed to update ${resource.table}:${id}`, message: err.message } }
  }
}

export async function drizzleDeleteRow({ resource, id }) {
  const table = getDrizzleTable(resource.table)
  if (!table) {
    return { status: 404, body: { error: `Table '${resource.table}' not found in Drizzle schema.` } }
  }

  if (process.env.DATABASE_URL) {
    try {
      await db.delete(table).where(eq(table.id, id))
      return { status: 200, body: { ok: true, deletedId: id } }
    } catch (err) {
      console.warn(`[DRIZZLE POOL DELETE FALLBACK] ${resource.table}:${id}:`, err.message)
    }
  }

  try {
    const url = new URL(resource.table, config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    const response = await fetch(url, { method: "DELETE", headers: authHeaders() })
    if (response.ok) {
      return { status: 200, body: { ok: true, deletedId: id } }
    }
    const errBody = await parseResponse(response)
    return { status: response.status || 500, body: errBody }
  } catch (err) {
    return { status: 500, body: { error: `Failed to delete ${resource.table}:${id}`, message: err.message } }
  }
}

export async function drizzleReplaceRows({ resource, body }) {
  const table = getDrizzleTable(resource.table)
  if (!table) {
    return { status: 404, body: { error: `Table '${resource.table}' not found in Drizzle schema.` } }
  }

  const items = Array.isArray(body) ? body : [body]

  if (process.env.DATABASE_URL) {
    try {
      const rows = items.map((item) => {
        const id = item?.id ? String(item.id) : crypto.randomUUID()
        if (resource.storage === "jsonb_document") {
          const { id: _ignoredId, ...payloadData } = item || {}
          return { id, payload: payloadData, updatedAt: new Date() }
        }
        return { ...item, id, updatedAt: new Date() }
      })

      if (rows.length > 0) {
        await db.insert(table).values(rows).onConflictDoUpdate({
          target: table.id,
          set: resource.storage === "jsonb_document"
            ? { payload: sql`excluded.payload`, updatedAt: new Date() }
            : { updatedAt: new Date() },
        })
      }
      return { status: 200, body: { ok: true, count: rows.length } }
    } catch (err) {
      console.warn(`[DRIZZLE POOL REPLACE FALLBACK] ${resource.table}:`, err.message)
    }
  }

  try {
    const rows = items.map((item) => {
      const id = item?.id ? String(item.id) : crypto.randomUUID()
      if (resource.storage === "jsonb_document") {
        const { id: _ignoredId, ...payloadData } = item || {}
        return { id, payload: payloadData }
      }
      return { id, ...item }
    })

    const url = new URL(resource.table, config.supabaseRestUrl)
    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(rows),
    })

    const data = await parseResponse(response)
    if (response.ok) {
      return { status: 200, body: { ok: true, count: rows.length } }
    }
    return { status: response.status || 500, body: data }
  } catch (err) {
    return { status: 500, body: { error: `Failed to replace rows in ${resource.table}`, message: err.message } }
  }
}
