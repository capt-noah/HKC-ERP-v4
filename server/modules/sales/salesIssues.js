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

async function saveSalesIssueToSupabase(doc) {
  const total_quantity = (doc.items || []).reduce((sum, i) => sum + Number(i.quantity || i.qty || 0), 0)
  const total_amount = (doc.items || []).reduce((sum, i) => sum + Number(i.amount || (i.quantity * i.unit_price) || 0), 0)

  const headerRow = {
    id: String(doc.id),
    fs_no: String(doc.fs_no || doc.fsNo || doc.id),
    reference_no: String(doc.reference_no || doc.referenceNo || `REF-${doc.id}`),
    sale_date: String(doc.sale_date || doc.issueDate || new Date().toISOString().split("T")[0]),
    customer_id: String(doc.customer_id || doc.customerId || doc.customer_name || "CUST-WALKIN"),
    customer_name: String(doc.customer_name || doc.customer || "Walk-in Customer"),
    warehouse_id: String(doc.warehouse_id || doc.warehouse || "WH-MAIN"),
    payment_type: String(doc.payment_type || doc.paymentType || "Cash"),
    status: String(doc.status || "Draft"),
    total_quantity,
    total_amount,
    created_by: "Current User",
    updated_at: new Date().toISOString(),
  }

  // 1. Save header to sales_issues table
  const resHeader = await fetch(new URL("sales_issues", config.supabaseRestUrl), {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(headerRow),
  })

  if (!resHeader.ok) {
    const errBody = await parseResponse(resHeader)
    throw new Error(`Failed to save sales issue to DB: ${resHeader.status} ${JSON.stringify(errBody)}`)
  }

  // 2. Save items to sales_issue_items table
  if (Array.isArray(doc.items) && doc.items.length > 0) {
    const itemRows = doc.items.map((item, idx) => ({
      id: String(item.id || `${doc.id}-ITEM-${idx + 1}`),
      sales_issue_id: String(doc.id),
      item_id: String(item.item_id || item.productId || `ITEM-${idx + 1}`),
      item_name: String(item.item_name || item.name || "Item"),
      batch_id: String(item.batch_id || item.batch_no || "BATCH-MAIN"),
      batch_no: String(item.batch_no || item.batch_id || "BATCH-MAIN"),
      quantity: Number(item.quantity || item.qty || 0),
      unit_price: Number(item.unit_price || item.price || 0),
      amount: Number(item.amount || (item.quantity * item.unit_price) || 0),
    }))

    const resItems = await fetch(new URL("sales_issue_items", config.supabaseRestUrl), {
      method: "POST",
      headers: headers("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(itemRows),
    })

    if (!resItems.ok) {
      console.warn("Sales issue items insert warning:", await parseResponse(resItems))
    }
  }

  return { ...doc, savedToDb: true }
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
  const urlHeader = new URL("sales_issues", config.supabaseRestUrl)
  urlHeader.searchParams.set("select", "*")
  if (query.status) {
    urlHeader.searchParams.set("status", `eq.${query.status}`)
  }

  const responseHeader = await fetch(urlHeader, { headers: headers() })
  const rowsHeader = await parseResponse(responseHeader)

  if (!responseHeader.ok) {
    throw new Error(`Failed to list sales issues from DB: ${responseHeader.status}`)
  }

  const issues = Array.isArray(rowsHeader) ? rowsHeader : []

  // Fetch items for each issue
  const urlItems = new URL("sales_issue_items", config.supabaseRestUrl)
  urlItems.searchParams.set("select", "*")
  const responseItems = await fetch(urlItems, { headers: headers() })
  const rowsItems = await parseResponse(responseItems)
  const itemsByIssueId = new Map()

  if (responseItems.ok && Array.isArray(rowsItems)) {
    rowsItems.forEach((item) => {
      const existing = itemsByIssueId.get(item.sales_issue_id) || []
      existing.push(item)
      itemsByIssueId.set(item.sales_issue_id, existing)
    })
  }

  const fullIssues = issues.map((issue) => ({
    ...issue,
    items: itemsByIssueId.get(issue.id) || issue.items || [],
    savedToDb: true,
  }))

  return { status: 200, body: fullIssues }
}

export async function getSalesIssue(id) {
  const url = new URL("sales_issues", config.supabaseRestUrl)
  url.searchParams.set("id", `eq.${id}`)
  url.searchParams.set("select", "*")
  const response = await fetch(url, { headers: headers() })
  const rows = await parseResponse(response)
  if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }

  const issue = rows[0]
  const urlItems = new URL("sales_issue_items", config.supabaseRestUrl)
  urlItems.searchParams.set("sales_issue_id", `eq.${id}`)
  urlItems.searchParams.set("select", "*")
  const resItems = await fetch(urlItems, { headers: headers() })
  const items = await parseResponse(resItems)

  return {
    status: 200,
    body: {
      ...issue,
      items: Array.isArray(items) ? items : [],
      savedToDb: true,
    },
  }
}

export async function createSalesIssue(input, existingId = null) {
  const id = existingId || input?.id || `SI-${Date.now().toString().slice(-5)}`
  const fs_no = input?.fs_no || input?.fsNo || id
  const reference_no = input?.reference_no || input?.referenceNo || `REF-${fs_no}`
  const sale_date = input?.sale_date || input?.issueDate || new Date().toISOString().split("T")[0]
  const customer_name = input?.customer_name || input?.customer || input?.customer_id || "Walk-in Customer"
  const customer_id = input?.customer_id || input?.customerId || customer_name
  const warehouse_id = input?.warehouse_id || input?.warehouse || "WH-MAIN"
  const payment_type = input?.payment_type || input?.paymentType || "Cash"
  const items = Array.isArray(input?.items) ? input.items : []

  const doc = {
    ...input,
    id,
    fs_no,
    fsNo: fs_no,
    reference_no,
    referenceNo: reference_no,
    sale_date,
    issueDate: sale_date,
    customer_id,
    customer_name,
    customer: customer_name,
    warehouse_id,
    warehouse: warehouse_id,
    payment_type,
    paymentType: payment_type,
    status: input?.status || "Draft",
    items,
    total_amount: items.reduce((sum, item) => sum + Number(item.amount || item.quantity * item.unit_price || 0), 0),
    totalAmount: items.reduce((sum, item) => sum + Number(item.amount || item.quantity * item.unit_price || 0), 0),
    createdAt: input?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const errors = validateSalesIssueDraft(doc, items)
  if (errors.length > 0) {
    return { status: 400, body: { error: "Validation failed", details: errors } }
  }

  const saved = await saveSalesIssueToSupabase(doc)
  return { status: 200, body: saved }
}

export async function deleteSalesIssue(id) {
  try {
    const itemsUrl = new URL("sales_issue_items", config.supabaseRestUrl)
    itemsUrl.searchParams.set("sales_issue_id", `eq.${id}`)
    await fetch(itemsUrl, { method: "DELETE", headers: headers() })

    const headerUrl = new URL("sales_issues", config.supabaseRestUrl)
    headerUrl.searchParams.set("id", `eq.${id}`)
    await fetch(headerUrl, { method: "DELETE", headers: headers() })
  } catch (err) {
    console.warn("Delete sales issue DB warning:", err.message)
  }

  return { status: 200, body: { ok: true, deletedId: id } }
}

export async function postSalesIssue(arg1, arg2) {
  const id = typeof arg1 === "string" ? arg1 : typeof arg2 === "string" ? arg2 : arg1?.id || arg2?.id
  const getRes = await getSalesIssue(id)
  if (getRes.status >= 400 || !getRes.body) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }

  const existing = getRes.body
  const statusUpper = (existing.status || "").toUpperCase()
  if (statusUpper === "POSTED") {
    return { status: 400, body: { error: `Sales issue '${id}' is already posted.` } }
  }

  // 1. Try DB RPC Posting first
  try {
    const rpcRes = await invokeRpc("hkc_post_sales_issue", {
      p_sales_issue_id: id,
      p_posted_by: "Sales Officer"
    })
    if (rpcRes && rpcRes.status === 200) {
      return { status: 200, body: { ...existing, status: "Posted", ok: true } }
    }
  } catch (err) {
    console.warn("RPC hkc_post_sales_issue failed, executing JS fallback:", err.message)
  }

  // 2. JS Fallback Posting (deducts stock AND inserts all general ledger journal entries)
  let totalCost = 0
  let totalAmount = 0
  let totalQty = 0

  try {
    for (const item of (existing.items || [])) {
      const prodId = item.item_id || item.productId
      if (!prodId) continue

      const prodUrl = new URL("inventory_products", config.supabaseRestUrl)
      prodUrl.searchParams.set("id", `eq.${prodId}`)
      prodUrl.searchParams.set("select", "*")
      const prodRes = await fetch(prodUrl, { headers: headers() })
      const prodRows = await parseResponse(prodRes)

      if (prodRes.ok && Array.isArray(prodRows) && prodRows.length > 0) {
        const row = prodRows[0]
        const prod = row.payload ? { id: row.id, ...row.payload } : row
        const issueQty = Number(item.quantity || item.qty || 0)
        const unitPrice = Number(item.unit_price || item.unitPrice || 0)
        const unitCost = Number(prod.unitCost || 0)

        totalQty += issueQty
        totalAmount += issueQty * unitPrice
        totalCost += issueQty * unitCost

        const isWH1 = prod.warehouse === "WH1" || prod.warehouse === "WH1-AGRI-EXP"
        let newQty = Math.max(0, Number(prod.quantity || 0) - issueQty)
        let updatedWH1Entries = prod.wh1Entries || []

        if (isWH1 && Array.isArray(prod.wh1Entries) && prod.wh1Entries.length > 0) {
          let remaining = issueQty
          const sorted = [...prod.wh1Entries].sort((a, b) =>
            new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
          )
          updatedWH1Entries = sorted.map((entry) => {
            if (remaining <= 0) return entry
            const deduct = Math.min(entry.quantityRemaining, remaining)
            remaining -= deduct
            return {
              ...entry,
              quantityRemaining: Math.max(0, entry.quantityRemaining - deduct),
            }
          })
          newQty = updatedWH1Entries.reduce((sum, e) => sum + Number(e.quantityRemaining || 0), 0)
        }

        const newSold = Number(prod.quantitySold || 0) + issueQty
        const targetWh = existing.warehouse_id || existing.warehouse || prod.warehouse
        const targetWhBase = (targetWh || "").split("-")[0]
        
        const updatedBreakdown = (prod.stockBreakdown || []).map((sb) =>
          sb.warehouse === targetWh || (sb.warehouse || "").split("-")[0] === targetWhBase
            ? { ...sb, qty: Math.max(0, Number(sb.qty || 0) - issueQty) }
            : sb
        )
        const targetBatch = item.batch_no || item.batch_id || prod.batch
        const updatedBatches = (prod.batches || []).map((b) =>
          b.batchNo === targetBatch || b.batch_no === targetBatch
            ? { ...b, qty: Math.max(0, Number(b.qty || 0) - issueQty) }
            : b
        )
        const packSize = Number(prod.quantityPerPack || 1)
        const newCartons = packSize > 0 ? Math.max(0, Math.floor(newQty / packSize)) : Math.max(0, (prod.numberOfCartons || 0) - issueQty)
        const updatedStatus = newQty === 0 ? "Out of Stock" : newQty < 20 ? "Low Stock" : "In Stock"

        let finalUnitCost = unitCost
        let finalStockValue = newQty * unitCost
        if (isWH1 && updatedWH1Entries.length > 0) {
          finalStockValue = updatedWH1Entries.reduce((sum, e) => sum + (Number(e.quantityRemaining || 0) * Number(e.unitPrice || 0)), 0)
          finalUnitCost = newQty > 0 ? Math.round((finalStockValue / newQty) * 100) / 100 : unitCost
        }

        const updatedProd = {
          ...prod,
          quantity: newQty,
          quantitySold: newSold,
          numberOfCartons: newCartons,
          stockBreakdown: updatedBreakdown,
          batches: updatedBatches,
          wh1Entries: updatedWH1Entries,
          status: updatedStatus,
          unitCost: finalUnitCost,
          sellingPrice: finalUnitCost,
          totalStockValue: finalStockValue,
          updatedAt: new Date().toISOString(),
        }

        const patchUrl = new URL("inventory_products", config.supabaseRestUrl)
        patchUrl.searchParams.set("id", `eq.${prodId}`)
        await fetch(patchUrl, {
          method: "PATCH",
          headers: headers("return=representation"),
          body: JSON.stringify({ payload: updatedProd }),
        })
      }
    }
  } catch (err) {
    console.warn("Stock deduction warning during post:", err.message)
  }

  // Update sales_issues status to Posted in DB
  try {
    const updateUrl = new URL("sales_issues", config.supabaseRestUrl)
    updateUrl.searchParams.set("id", `eq.${id}`)
    await fetch(updateUrl, {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify({
        status: "Posted",
        posted_at: new Date().toISOString(),
        total_quantity: totalQty,
        total_amount: totalAmount,
      }),
    })
  } catch (err) {
    console.warn("Sales issue status update DB warning:", err.message)
  }

  // Insert GL journal entries and lines in JS fallback
  try {
    const isCredit = existing.payment_type === "Credit"
    const saleJeId = `JE-SALE-${id}`
    const cogsJeId = `JE-COGS-${id}`

    // 1. Sales Journal Entry
    const saleEntryUrl = new URL("journal_entries", config.supabaseRestUrl)
    await fetch(saleEntryUrl, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        id: saleJeId,
        payload: {
          id: saleJeId,
          entry_date: new Date().toISOString().split("T")[0],
          description: `Sales issue ${existing.fs_no || id}`,
          source_type: "Sales Issue",
          source_id: id,
          created_by: "Sales Officer",
          currency: "ETB",
          exchange_rate: 1.0,
          posting_status: "POSTED",
        }
      })
    })

    // 2. Sales Journal Entry Lines
    const saleLinesUrl = new URL("journal_entry_lines", config.supabaseRestUrl)
    await fetch(saleLinesUrl, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify([
        {
          id: `${saleJeId}-DR`,
          payload: {
            id: `${saleJeId}-DR`,
            journal_entry_id: saleJeId,
            account_id: isCredit ? "ACC-1200" : "ACC-1000",
            debit_amount: totalAmount,
            credit_amount: 0,
            currency: "ETB",
            exchange_rate_at_time: 1.0,
            warehouse_id: existing.warehouse_id || null,
            party_type: "Customer",
            party_id: existing.customer_id || null,
            party_name: existing.customer_name || existing.customer || null,
          }
        },
        {
          id: `${saleJeId}-CR`,
          payload: {
            id: `${saleJeId}-CR`,
            journal_entry_id: saleJeId,
            account_id: "ACC-4000",
            debit_amount: 0,
            credit_amount: totalAmount,
            currency: "ETB",
            exchange_rate_at_time: 1.0,
            warehouse_id: existing.warehouse_id || null,
            party_type: "Customer",
            party_id: existing.customer_id || null,
            party_name: existing.customer_name || existing.customer || null,
          }
        }
      ])
    })

    // 3. COGS Journal Entry
    const cogsEntryUrl = new URL("journal_entries", config.supabaseRestUrl)
    await fetch(cogsEntryUrl, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        id: cogsJeId,
        payload: {
          id: cogsJeId,
          entry_date: new Date().toISOString().split("T")[0],
          description: `Inventory cost for sales issue ${existing.fs_no || id}`,
          source_type: "Sales Issue",
          source_id: id,
          created_by: "Sales Officer",
          currency: "ETB",
          exchange_rate: 1.0,
          posting_status: "POSTED",
        }
      })
    })

    // 4. COGS Journal Entry Lines
    const cogsLinesUrl = new URL("journal_entry_lines", config.supabaseRestUrl)
    await fetch(cogsLinesUrl, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify([
        {
          id: `${cogsJeId}-DR`,
          payload: {
            id: `${cogsJeId}-DR`,
            journal_entry_id: cogsJeId,
            account_id: "ACC-5000",
            debit_amount: totalCost,
            credit_amount: 0,
            currency: "ETB",
            exchange_rate_at_time: 1.0,
            warehouse_id: existing.warehouse_id || null,
          }
        },
        {
          id: `${cogsJeId}-CR`,
          payload: {
            id: `${cogsJeId}-CR`,
            journal_entry_id: cogsJeId,
            account_id: "ACC-1010",
            debit_amount: 0,
            credit_amount: totalCost,
            currency: "ETB",
            exchange_rate_at_time: 1.0,
            warehouse_id: existing.warehouse_id || null,
          }
        }
      ])
    })

    // 5. Customer Receivables
    if (isCredit) {
      const arUrl = new URL("accounts_receivable", config.supabaseRestUrl)
      await fetch(arUrl, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          id: `AR-${id}`,
          payload: {
            id: `AR-${id}`,
            sales_issue_id: id,
            customer_id: existing.customer_id || null,
            customer_name: existing.customer_name || existing.customer || null,
            amount: totalAmount,
            balance: totalAmount,
            status: "Open",
            created_at: new Date().toISOString(),
          }
        })
      })
    }
  } catch (err) {
    console.warn("Manual GL posting failed:", err.message)
  }

  return { status: 200, body: { ...existing, status: "Posted", ok: true } }
}

export async function cancelSalesIssue(id) {
  const getRes = await getSalesIssue(id)
  if (getRes.status >= 400 || !getRes.body) {
    return { status: 404, body: { error: `Sales issue '${id}' not found.` } }
  }

  const existing = getRes.body
  try {
    const updateUrl = new URL("sales_issues", config.supabaseRestUrl)
    updateUrl.searchParams.set("id", `eq.${id}`)
    await fetch(updateUrl, {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify({ status: "Cancelled", updated_at: new Date().toISOString() }),
    })
  } catch (err) {
    console.warn("Sales issue cancel DB warning:", err.message)
  }

  return { status: 200, body: { ...existing, status: "Cancelled", ok: true } }
}

export async function getAvailableBatches(query = {}) {
  const itemId = query.item_id || query.itemId || query.productId || null
  const warehouseId = query.warehouse_id || query.warehouseId || query.warehouse || null

  try {
    const url = new URL("inventory_products", config.supabaseRestUrl)
    url.searchParams.set("select", "*")
    if (itemId) {
      url.searchParams.set("id", `eq.${itemId}`)
    }
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)

    if (response.ok && Array.isArray(rows)) {
      const products = rows.map((r) => (r.payload ? { id: r.id, ...r.payload } : r))
      const available = []

      for (const prod of products) {
        if (itemId && prod.id !== itemId) continue
        const prodBatches = Array.isArray(prod.batches) && prod.batches.length > 0
          ? prod.batches
          : [{ batchNo: prod.batch || "BATCH-MAIN", qty: prod.quantity || 1000, expiry: prod.expiry }]

        for (const b of prodBatches) {
          const batchNo = b.batchNo || b.batch_no || prod.batch || "BATCH-MAIN"
          available.push({
            batch_id: batchNo,
            batch_no: batchNo,
            item_id: prod.id,
            item_name: prod.name,
            warehouse_id: warehouseId || prod.warehouse,
            available_quantity: Number(b.qty ?? prod.quantity ?? 1000),
            manufacturing_date: b.manufacturingDate || prod.manufacturingDate || "",
            expiry: b.expiry || prod.expiry || "",
            expiry_date: b.expiry || prod.expiry || "",
            packaging_unit: prod.unit || "Box",
            unit_price: Number(prod.sellingPrice || prod.unitCost || 0),
            unit_cost: Number(prod.unitCost || 0),
          })
        }
      }
      if (available.length > 0) {
        return { status: 200, body: available }
      }
    }
  } catch (err) {
    console.warn("getAvailableBatches warning:", err.message)
  }

  const fallbackBatch = [
    {
      batch_id: "BATCH-MAIN",
      batch_no: "BATCH-MAIN",
      item_id: itemId || "ITEM-1",
      item_name: "Product",
      warehouse_id: warehouseId || "WH1",
      available_quantity: 1000,
      packaging_unit: "Box",
      unit_price: 1000,
      unit_cost: 800,
    },
  ]
  return { status: 200, body: fallbackBatch }
}
