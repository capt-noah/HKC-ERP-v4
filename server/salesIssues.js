import { config } from "./config.js"
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

function restUrl(path) {
  return new URL(path, config.supabaseRestUrl)
}

async function parse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request(path, init = {}) {
  const response = await fetch(restUrl(path), {
    ...init,
    headers: { ...headers(init.prefer), ...(init.headers || {}) },
  })
  const body = await parse(response)
  if (!response.ok) {
    const message =
      body?.message || body?.error || `Supabase request failed with status ${response.status}.`
    const error = new Error(message)
    error.status = response.status
    error.body = body
    throw error
  }
  return body
}

// ── Inventory helpers ─────────────────────────────────────────────────────────

async function loadProductPayload(itemId) {
  const rows = await request(
    `inventory_products?id=eq.${encodeURIComponent(itemId)}&select=id,payload`,
  )
  return rows?.[0]?.payload || null
}

async function enrichItemsWithInventory(items) {
  const cache = new Map()
  const enriched = []
  for (const item of Array.isArray(items) ? items : []) {
    if (!cache.has(item.item_id)) {
      cache.set(item.item_id, await loadProductPayload(item.item_id).catch(() => null))
    }
    const product = cache.get(item.item_id)
    enriched.push({
      ...item,
      packaging_unit: item.packaging_unit || product?.unit || "",
    })
  }
  return enriched
}

async function validateSalesIssueInventory(issue, items) {
  const errors = []
  for (const [index, item] of items.entries()) {
    const label = `Row ${index + 1}`
    const product = await loadProductPayload(item.item_id)
    if (!product) {
      errors.push(`${label}: Item does not exist.`)
      continue
    }
    const availableBatch = availableBatchesForProduct(product, issue.warehouse_id).find(
      (batch) => batch.batch_no === item.batch_no,
    )
    if (!availableBatch) {
      errors.push(
        `${label}: Batch is unavailable, expired, or not stocked in the selected warehouse.`,
      )
      continue
    }
    if (Number(item.quantity) > Number(availableBatch.available_quantity)) {
      errors.push(
        `${label}: Quantity exceeds available batch balance for ${item.batch_no}.`,
      )
    }
  }
  return errors
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function jsonResult(status, body) {
  return { status, body }
}

function normalizeIssueBody(body) {
  const items = (body.items || []).map((item, index) => ({
    id: item.id || `${body.id || crypto.randomUUID()}-ITEM-${index + 1}`,
    sales_issue_id: body.id,
    item_id: item.item_id,
    item_name: item.item_name,
    batch_id: item.batch_id || item.batch_no,
    batch_no: item.batch_no || item.batch_id,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    amount: calculateAmount(item.quantity, item.unit_price),
  }))
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  return {
    issue: {
      id: body.id || crypto.randomUUID(),
      fs_no: String(body.fs_no || ""),
      reference_no: String(body.reference_no || ""),
      sale_date: body.sale_date,
      customer_id: body.customer_id,
      customer_name: body.customer_name,
      warehouse_id: body.warehouse_id,
      payment_type: body.payment_type,
      status: body.status || "Draft",
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      created_by: body.created_by,
    },
    items,
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────
// All functions now receive plain data (query object, body object, id string)
// instead of the raw Node IncomingMessage — Express handles parsing upstream.

export async function listSalesIssues(query = {}) {
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 10)))
  const sort = query.sort || "sale_date.desc"
  const search = (query.search || "").trim().toLowerCase()

  const issues = await request(`sales_issues?select=*&order=${encodeURIComponent(sort)}`)
  const issueItems = await request("sales_issue_items?select=*")

  const itemsByIssue = new Map()
  for (const item of Array.isArray(issueItems) ? issueItems : []) {
    const current = itemsByIssue.get(item.sales_issue_id) || []
    current.push(item)
    itemsByIssue.set(item.sales_issue_id, current)
  }

  let rows = Array.isArray(issues) ? issues : []

  for (const key of ["customer_id", "warehouse_id", "status"]) {
    const value = query[key]
    if (value && value !== "ALL") rows = rows.filter((row) => String(row[key]) === value)
  }

  const { from, to } = query
  if (from) rows = rows.filter((row) => row.sale_date >= from)
  if (to) rows = rows.filter((row) => row.sale_date <= to)

  if (search) {
    rows = rows.filter((row) => {
      const rowItems = itemsByIssue.get(row.id) || []
      const values = [
        row.fs_no,
        row.reference_no,
        row.customer_name,
        ...rowItems.flatMap((item) => [item.item_name, item.batch_no]),
      ]
      return values.some((value) => String(value || "").toLowerCase().includes(search))
    })
  }

  const { item_id: itemId, batch_no: batchNo } = query
  if (itemId && itemId !== "ALL") {
    rows = rows.filter((row) =>
      (itemsByIssue.get(row.id) || []).some((item) => item.item_id === itemId),
    )
  }
  if (batchNo && batchNo !== "ALL") {
    rows = rows.filter((row) =>
      (itemsByIssue.get(row.id) || []).some((item) => item.batch_no === batchNo),
    )
  }

  const total = rows.length
  const paged = []
  for (const row of rows.slice((page - 1) * pageSize, page * pageSize)) {
    paged.push({
      ...row,
      items: await enrichItemsWithInventory(itemsByIssue.get(row.id) || []),
    })
  }

  return jsonResult(200, { rows: paged, total, page, pageSize })
}

export async function getSalesIssue(id) {
  const issue = await request(`sales_issues?id=eq.${encodeURIComponent(id)}&select=*`)
  const items = await request(
    `sales_issue_items?sales_issue_id=eq.${encodeURIComponent(id)}&select=*`,
  )
  return jsonResult(
    issue?.[0] ? 200 : 404,
    issue?.[0]
      ? { ...issue[0], items: await enrichItemsWithInventory(items) }
      : { error: "Sales issue not found." },
  )
}

export async function createSalesIssue(body = {}) {
  const normalized = normalizeIssueBody({ ...body, id: body.id || crypto.randomUUID() })
  normalized.items = normalized.items.map((item) => ({
    ...item,
    sales_issue_id: normalized.issue.id,
  }))

  const errors = validateSalesIssueDraft(normalized.issue, normalized.items)
  if (errors.length) return jsonResult(400, { error: errors[0], errors })

  const inventoryErrors = await validateSalesIssueInventory(normalized.issue, normalized.items)
  if (inventoryErrors.length) return jsonResult(400, { error: inventoryErrors[0], errors: inventoryErrors })

  await request("sales_issues", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify(normalized.issue),
  })
  if (normalized.items.length) {
    await request("sales_issue_items", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(normalized.items),
    })
  }
  return getSalesIssue(normalized.issue.id)
}

export async function updateSalesIssue(body = {}, id) {
  const existing = await request(`sales_issues?id=eq.${encodeURIComponent(id)}&select=*`)
  if (!existing?.[0]) return jsonResult(404, { error: "Sales issue not found." })
  if (existing[0].status !== "Draft") return jsonResult(409, { error: "Only draft records can be edited." })

  const normalized = normalizeIssueBody({ ...body, id, status: "Draft" })
  normalized.items = normalized.items.map((item) => ({ ...item, sales_issue_id: id }))

  const errors = validateSalesIssueDraft(normalized.issue, normalized.items)
  if (errors.length) return jsonResult(400, { error: errors[0], errors })

  const inventoryErrors = await validateSalesIssueInventory(normalized.issue, normalized.items)
  if (inventoryErrors.length) return jsonResult(400, { error: inventoryErrors[0], errors: inventoryErrors })

  await request(`sales_issues?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify(normalized.issue),
  })
  await request(`sales_issue_items?sales_issue_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  })
  if (normalized.items.length) {
    await request("sales_issue_items", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(normalized.items),
    })
  }
  return getSalesIssue(id)
}

export async function deleteSalesIssue(id) {
  const existing = await request(`sales_issues?id=eq.${encodeURIComponent(id)}&select=*`)
  if (!existing?.[0]) return jsonResult(404, { error: "Sales issue not found." })
  if (existing[0].status !== "Draft") return jsonResult(409, { error: "Only draft records can be deleted." })
  await request(`sales_issues?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  })
  return jsonResult(200, { ok: true })
}

export async function postSalesIssue(body = {}, id) {
  const result = await request("rpc/hkc_post_sales_issue", {
    method: "POST",
    body: JSON.stringify({
      p_sales_issue_id: id,
      ...(body?.posted_by ? { p_posted_by: body.posted_by } : {}),
    }),
  })
  return jsonResult(200, result)
}

export async function cancelSalesIssue(id) {
  const existing = await request(`sales_issues?id=eq.${encodeURIComponent(id)}&select=*`)
  if (!existing?.[0]) return jsonResult(404, { error: "Sales issue not found." })
  if (existing[0].status === "Posted") {
    return jsonResult(409, {
      error: "Posted sales issues cannot be cancelled without a reversal workflow.",
    })
  }
  await request(`sales_issues?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ status: "Cancelled", updated_at: new Date().toISOString() }),
  })
  return getSalesIssue(id)
}

export async function getAvailableBatches(query = {}) {
  const { item_id: itemId, warehouse_id: warehouseId } = query
  if (!itemId || !warehouseId) {
    return jsonResult(400, { error: "item_id and warehouse_id are required." })
  }
  const product = await loadProductPayload(itemId)
  if (!product) return jsonResult(404, { error: "Item not found." })
  const batches = availableBatchesForProduct(product, warehouseId)
  return jsonResult(200, batches)
}
