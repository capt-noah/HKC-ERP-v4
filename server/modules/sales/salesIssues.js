import { config } from "../../config.js"
import { availableBatchesForProduct, calculateAmount, validateSalesIssueDraft } from "./salesIssueLogic.js"
import crypto from "node:crypto"

// ── Supabase helpers ──────────────────────────────────────────────────────────

function headers(prefer) {
  const apiKey = config.supabaseServiceRoleKey || config.supabasePublishableKey
  const result = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }
  if (prefer) result.Prefer = prefer
  return result
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

async function getDocument(table, id) {
  const url = new URL(table, config.supabaseRestUrl)
  url.searchParams.set("id", `eq.${id}`)
  url.searchParams.set("select", "*")
  const response = await fetch(url, { headers: headers() })
  const rows = await parseResponse(response)
  if (!response.ok) {
    const error = new Error(`Failed to fetch ${table}:${id}`)
    error.status = response.status
    error.body = rows
    throw error
  }
  if (Array.isArray(rows) && rows.length > 0) {
    const r = rows[0]
    return r.payload ? { id: r.id, ...r.payload } : r
  }
  return null
}

async function listDocuments(table) {
  const url = new URL(table, config.supabaseRestUrl)
  url.searchParams.set("select", "*")
  const response = await fetch(url, { headers: headers() })
  const rows = await parseResponse(response)
  if (!response.ok) {
    const error = new Error(`Failed to list ${table}`)
    error.status = response.status
    error.body = rows
    throw error
  }
  return Array.isArray(rows) ? rows.map((r) => (r.payload ? { id: r.id, ...r.payload } : r)) : []
}

async function saveDocument(table, doc) {
  const response = await fetch(new URL(table, config.supabaseRestUrl), {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({ id: doc.id, payload: doc }),
  })
  const rows = await parseResponse(response)
  if (!response.ok) {
    const error = new Error(`Failed to save document in ${table}`)
    error.status = response.status
    error.body = rows
    throw error
  }
  return Array.isArray(rows) ? rows[0].payload : rows?.payload || doc
}

async function invokeRpc(fnName, payload) {
  const response = await fetch(new URL(`rpc/${fnName}`, config.supabaseRestUrl), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  })
  const body = await parseResponse(response)
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `RPC ${fnName} failed`)
    error.status = response.status
    error.body = body
    throw error
  }
  return { status: 200, body }
}

// ── Service Logic ─────────────────────────────────────────────────────────────

export async function listSalesIssues(query = {}) {
  const url = new URL("sales_issues", config.supabaseRestUrl)
  url.searchParams.set("select", "*")
  if (query.status) {
    url.searchParams.set("status", `eq.${query.status}`)
  }
  const response = await fetch(url, { headers: headers() })
  const rows = await parseResponse(response)
  if (!response.ok) {
    return { status: response.status, body: rows }
  }
  const items = Array.isArray(rows) ? rows.map((r) => (r.payload ? { id: r.id, ...r.payload } : r)) : []
  return { status: 200, body: items }
}

export async function getSalesIssue(id) {
  const doc = await getDocument("sales_issues", id)
  if (!doc) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }
  return { status: 200, body: doc }
}

export async function createSalesIssue(input, existingId = null) {
  const id = existingId || input?.id || `SI-${Date.now().toString().slice(-5)}`
  const doc = {
    id,
    issueDate: input?.issueDate || new Date().toISOString().split("T")[0],
    postingDate: input?.postingDate || null,
    customer: input?.customer || "",
    customerId: input?.customerId || null,
    warehouse: input?.warehouse || "WH-MAIN",
    status: "DRAFT",
    remarks: input?.remarks || "",
    items: Array.isArray(input?.items) ? input.items : [],
    totalAmount: 0,
    journalEntryId: null,
    stockMovementIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const validation = validateSalesIssueDraft(doc)
  if (!validation.valid) {
    return { status: 400, body: { error: "Validation failed", details: validation.errors } }
  }

  doc.totalAmount = calculateAmount(doc.items)
  const saved = await saveDocument("sales_issues", doc)
  return { status: 200, body: saved }
}

export async function deleteSalesIssue(id) {
  const existing = await getDocument("sales_issues", id)
  if (!existing) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }
  if (existing.status !== "DRAFT") {
    return {
      status: 400,
      body: { error: `Cannot delete sales issue '${id}' in status '${existing.status}'. Only DRAFT issues can be deleted.` },
    }
  }

  const url = new URL("sales_issues", config.supabaseRestUrl)
  url.searchParams.set("id", `eq.${id}`)
  const response = await fetch(url, { method: "DELETE", headers: headers() })
  const body = await parseResponse(response)
  return { status: response.status, body: body || { ok: true, deletedId: id } }
}

export async function postSalesIssue(bodyInput, id) {
  const existing = await getDocument("sales_issues", id)
  if (!existing) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }
  if (existing.status !== "DRAFT") {
    return {
      status: 400,
      body: { error: `Sales issue '${id}' is already in status '${existing.status}' and cannot be posted again.` },
    }
  }

  const merged = { ...existing, ...(bodyInput || {}) }
  const validation = validateSalesIssueDraft(merged)
  if (!validation.valid) {
    return { status: 400, body: { error: "Validation failed prior to posting", details: validation.errors } }
  }

  const postingDate = bodyInput?.postingDate || new Date().toISOString().split("T")[0]
  const pItems = merged.items.map((i) => ({
    productId: i.productId,
    batchId: i.batchId,
    qty: Number(i.qty),
    unitPrice: Number(i.unitPrice),
  }))

  const rpcResult = await invokeRpc("hkc_post_sales_issue", {
    p_sales_issue_id: id,
    p_posting_date: postingDate,
    p_items: pItems,
  })

  return rpcResult
}

export async function cancelSalesIssue(id) {
  const existing = await getDocument("sales_issues", id)
  if (!existing) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }
  if (existing.status !== "POSTED") {
    return {
      status: 400,
      body: { error: `Sales issue '${id}' is in status '${existing.status}'. Only POSTED issues can be cancelled.` },
    }
  }

  const rpcResult = await invokeRpc("hkc_cancel_sales_issue", {
    p_sales_issue_id: id,
  })

  return rpcResult
}

export async function getAvailableBatches(query = {}) {
  const warehouse = query.warehouse || null
  const productId = query.productId || null
  const allBatches = await listDocuments("inventory_batches")
  const available = availableBatchesForProduct(allBatches, productId, warehouse)
  return { status: 200, body: available }
}
