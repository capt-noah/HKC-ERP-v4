import { config } from "../../config.js"
import {
  generateProcessingServiceRevenueJournalEntry,
  validateProcessingServiceOrder,
  VALID_PROCESSING_STAGES,
} from "./processingServicesLogic.js"

const memoryProcessingServices = new Map()

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

// ── Initial Seed Data for Memory Fallback Store ──────────────────────────────
const INITIAL_PROCESSING_SERVICES = [
  {
    id: "PS-2026-001",
    reference_number: "PS-2026-001",
    client_company_name: "Limmu Coffee Growers Union",
    customer_id: "CUST-LIMMU",
    goods_description: "Raw Arabica Coffee Beans (Grade 4 Unwashed)",
    quantity: 500,
    uom: "Quintal",
    entry_date: "2026-08-01",
    agreed_price: 75000,
    currency: "ETB",
    status: "Processed",
    status_history: [
      { stage: "Received", timestamp: "2026-08-01T10:30:00.000Z" },
      { stage: "Processed", timestamp: "2026-08-02T14:15:00.000Z" },
    ],
    assigned_to: "Abebe Bikila",
    invoice_id: null,
    notes: "Toll milling, washing, and moisture level testing to 11.5%.",
    contract_url: null,
    contract_file_name: null,
    created_at: "2026-07-28T08:00:00.000Z",
    updated_at: "2026-08-02T14:15:00.000Z",
  },
  {
    id: "PS-2026-002",
    reference_number: "PS-2026-002",
    client_company_name: "Yirgacheffe Export Farmers Co.",
    customer_id: "CUST-YIRGA",
    goods_description: "Natural Processed Coffee Cherry",
    quantity: 350,
    uom: "Quintal",
    entry_date: "2026-08-05",
    agreed_price: 52500,
    currency: "ETB",
    status: "Received",
    status_history: [
      { stage: "Received", timestamp: "2026-08-05T11:00:00.000Z" },
    ],
    assigned_to: "Abebe Bikila",
    invoice_id: null,
    notes: "Awaiting sun-drying floor allocation.",
    contract_url: null,
    contract_file_name: null,
    created_at: "2026-08-03T09:00:00.000Z",
    updated_at: "2026-08-05T11:00:00.000Z",
  },
]

INITIAL_PROCESSING_SERVICES.forEach((item) => memoryProcessingServices.set(item.id, item))

export async function listProcessingServices(query = {}) {
  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("select", "*")
    if (query.status) {
      url.searchParams.set("status", `eq.${query.status}`)
    }
    url.searchParams.set("order", "created_at.desc")
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows }
    }
  } catch (err) {
    console.warn("listProcessingServices DB warning:", err.message)
  }

  let list = Array.from(memoryProcessingServices.values())
  if (query.status) {
    list = list.filter((item) => item.status === query.status)
  }
  return { status: 200, body: list }
}

export async function getProcessingService(id) {
  if (memoryProcessingServices.has(id)) {
    return { status: 200, body: memoryProcessingServices.get(id) }
  }

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    url.searchParams.set("select", "*")
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows[0] }
    }
  } catch (err) {
    console.warn("getProcessingService DB warning:", err.message)
  }

  return { status: 404, body: { error: `Processing service '${id}' not found.` } }
}

export async function createProcessingService(input) {
  const errors = validateProcessingServiceOrder(input)
  if (errors.length > 0) {
    return { status: 400, body: { error: "Validation failed", details: errors } }
  }

  const id = input?.id || `PS-${Date.now().toString().slice(-5)}`
  const reference_number = input?.reference_number || input?.referenceNumber || id
  const client_company_name = input?.client_company_name || input?.customer_name || input?.clientName || "Client Company"

  const doc = {
    id,
    reference_number,
    referenceNumber: reference_number,
    client_company_name,
    customer_name: client_company_name,
    customer_id: input?.customer_id || null,
    goods_description: input?.goods_description || "Raw Agricultural Commodity",
    quantity: Number(input?.quantity || 1),
    uom: input?.uom || "Quintal",
    entry_date: input?.entry_date || input?.entryDate || new Date().toISOString().split("T")[0],
    agreed_price: Number(input?.agreed_price || input?.agreedPrice || 0),
    currency: input?.currency || "ETB",
    status: "Received",
    status_history: [
      { stage: "Received", timestamp: new Date().toISOString() },
    ],
    assigned_to: input?.assigned_to || input?.assignedTo || "",
    invoice_id: null,
    notes: input?.notes || "",
    contract_url: null,
    contract_file_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  memoryProcessingServices.set(id, doc)

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    const response = await fetch(url, {
      method: "POST",
      headers: headers("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(doc),
    })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows[0] }
    }
  } catch (err) {
    console.warn("createProcessingService DB warning:", err.message)
  }

  return { status: 200, body: doc }
}

export async function updateProcessingService(input, id) {
  const getRes = await getProcessingService(id)
  if (getRes.status >= 400 || !getRes.body) {
    return { status: 404, body: { error: `Processing service '${id}' not found.` } }
  }

  const existing = getRes.body
  const updated = {
    ...existing,
    ...input,
    id,
    updated_at: new Date().toISOString(),
  }

  memoryProcessingServices.set(id, updated)

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    await fetch(url, {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify(updated),
    })
  } catch (err) {
    console.warn("updateProcessingService DB warning:", err.message)
  }

  return { status: 200, body: updated }
}

export async function transitionProcessingServiceStage(id, targetStage) {
  if (!VALID_PROCESSING_STAGES.includes(targetStage)) {
    return { status: 400, body: { error: `Invalid stage '${targetStage}'. Must be one of: ${VALID_PROCESSING_STAGES.join(", ")}` } }
  }

  const getRes = await getProcessingService(id)
  if (getRes.status >= 400 || !getRes.body) {
    return { status: 404, body: { error: `Processing service '${id}' not found.` } }
  }

  const existing = getRes.body
  const history = Array.isArray(existing.status_history) ? [...existing.status_history] : []
  history.push({ stage: targetStage, timestamp: new Date().toISOString() })

  let invoiceId = existing.invoice_id
  let journalEntry = null

  // AUTOMATED REVENUE RECOGNITION WHEN STAGE REACHES 'Delivered'
  if (targetStage === "Delivered" && !existing.invoice_id) {
    invoiceId = `INV-PS-${id}`
    journalEntry = generateProcessingServiceRevenueJournalEntry({ ...existing, id })

    // Save invoice to Supabase invoices table
    try {
      const clientName = existing.client_company_name || existing.customer_name || "Client Company"
      const invoicePayload = {
        id: invoiceId,
        invoice_number: invoiceId,
        customer_name: clientName,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        line_items: [
          {
            description: `Toll processing fee for ${existing.goods_description} (${existing.quantity} ${existing.uom})`,
            qty: Number(existing.quantity || 1),
            unit_price: Number(existing.agreed_price || 0) / Number(existing.quantity || 1),
            total: Number(existing.agreed_price || 0),
          }
        ],
        subtotal: Number(existing.agreed_price || 0),
        tax_amount: 0,
        discount_amount: 0,
        total_amount: Number(existing.agreed_price || 0),
        amount_paid: 0,
        balance_due: Number(existing.agreed_price || 0),
        status: "Unpaid",
        currency: "ETB",
      }

      const invUrl = new URL("invoices", config.supabaseRestUrl)
      await fetch(invUrl, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          id: invoiceId,
          payload: invoicePayload,
        })
      })
    } catch (err) {
      console.warn("Failed to persist service invoice in DB:", err.message)
    }

    // Save journal entry & lines to Supabase
    try {
      // 1. Journal Entry
      const jeUrl = new URL("journal_entries", config.supabaseRestUrl)
      await fetch(jeUrl, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          id: journalEntry.id,
          payload: {
            id: journalEntry.id,
            entry_number: journalEntry.id,
            entry_date: journalEntry.date,
            description: journalEntry.description,
            source_type: journalEntry.sourceType,
            source_id: journalEntry.sourceId,
            created_by: journalEntry.createdBy,
            currency: "ETB",
            exchange_rate: 1.0,
            posting_status: "POSTED",
          }
        })
      })

      // 2. Journal Entry Lines
      const jeLinesUrl = new URL("journal_entry_lines", config.supabaseRestUrl)
      await fetch(jeLinesUrl, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(
          journalEntry.lines.map((l, idx) => ({
            id: `${journalEntry.id}-${idx + 1}`,
            payload: {
              id: `${journalEntry.id}-${idx + 1}`,
              journal_entry_id: journalEntry.id,
              account_id: l.accountId === "1200" ? "ACC-1200" : l.accountId === "4002" ? "ACC-4002" : l.accountId,
              debit_amount: l.debitAmount,
              credit_amount: l.creditAmount,
              currency: "ETB",
              exchange_rate_at_time: 1.0,
              warehouse_id: "WH1",
              party_type: l.accountId === "1200" ? "Customer" : null,
              party_id: l.party_id || null,
              party_name: l.party_name || null,
            }
          }))
        )
      })
    } catch (err) {
      console.warn("Failed to persist service journal entry in DB:", err.message)
    }
  }

  const updatedDoc = {
    ...existing,
    status: targetStage,
    status_history: history,
    invoice_id: invoiceId,
    updated_at: new Date().toISOString(),
  }

  memoryProcessingServices.set(id, updatedDoc)

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    await fetch(url, {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify({ status: targetStage, status_history: history, invoice_id: invoiceId, updated_at: new Date().toISOString() }),
    })
  } catch (err) {
    console.warn("transitionProcessingServiceStage DB warning:", err.message)
  }

  return {
    status: 200,
    body: {
      ...updatedDoc,
      ok: true,
      journalEntry,
    },
  }
}

export async function deleteProcessingService(id) {
  memoryProcessingServices.delete(id)

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    await fetch(url, { method: "DELETE", headers: headers() })
  } catch (err) {
    console.warn("deleteProcessingService DB warning:", err.message)
  }

  return { status: 200, body: { ok: true, deletedId: id } }
}
