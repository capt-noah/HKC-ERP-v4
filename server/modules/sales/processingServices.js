import { config } from "../../config.js"
import {
  generateProcessingServiceRevenueJournalEntry,
  validateProcessingServiceOrder,
  VALID_PROCESSING_STAGES,
} from "./processingServicesLogic.js"

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
    if (response.ok && Array.isArray(rows)) {
      return { status: 200, body: rows }
    }
    return { status: response.status || 500, body: rows || [] }
  } catch (err) {
    return { status: 500, body: { error: "Failed to list processing services", message: err.message } }
  }
}

export async function getProcessingService(id) {
  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    url.searchParams.set("select", "*")
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows[0] }
    }
    return { status: 404, body: { error: `Processing service '${id}' not found.` } }
  } catch (err) {
    return { status: 500, body: { error: `Failed to get processing service '${id}'`, message: err.message } }
  }
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
    client_company_name,
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
    assigned_to: input?.assigned_to || input?.assignedTo || null,
    invoice_id: null,
    notes: input?.notes || "",
    contract_url: input?.contract_url || null,
    contract_file_name: input?.contract_file_name || null,
    locked_processing_rate: input?.locked_processing_rate ?? null,
    locked_processing_fee: input?.locked_processing_fee ?? null,
    locked_storage_fee: input?.locked_storage_fee ?? null,
    locked_total_fee: input?.locked_total_fee ?? null,
    processed_at: input?.processed_at ?? null,
    delivered_at: input?.delivered_at ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

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
    if (!response.ok) {
      return { status: response.status, body: rows }
    }
    return { status: 200, body: doc }
  } catch (err) {
    return { status: 500, body: { error: "Failed to create processing service", message: err.message } }
  }
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

  // Remove virtual / non-column fields if present
  delete updated.referenceNumber
  delete updated.customer_name
  delete updated.clientName
  delete updated.assignedTo
  delete updated.entryDate
  delete updated.agreedPrice

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    const response = await fetch(url, {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify(updated),
    })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows[0] }
    }
    if (!response.ok) {
      return { status: response.status, body: rows }
    }
    return { status: 200, body: updated }
  } catch (err) {
    return { status: 500, body: { error: "Failed to update processing service", message: err.message } }
  }
}

export async function transitionProcessingServiceStage(id, targetStage, extraData = {}) {
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

  // Rate locking parameters
  let lockedProcessingRate = existing.locked_processing_rate ?? null
  let lockedProcessingFee = existing.locked_processing_fee ?? null
  let lockedStorageFee = existing.locked_storage_fee ?? null
  let lockedTotalFee = existing.locked_total_fee ?? null
  let processedAt = existing.processed_at ?? null
  let deliveredAt = existing.delivered_at ?? null
  let agreedPrice = Number(existing.agreed_price || 0)

  if (targetStage === "Processed") {
    if (!processedAt) processedAt = new Date().toISOString()
    if (extraData.processingRate !== undefined && extraData.processingRate !== null) {
      lockedProcessingRate = Number(extraData.processingRate)
    }
    if (extraData.processingFee !== undefined && extraData.processingFee !== null) {
      lockedProcessingFee = Number(extraData.processingFee)
    } else if (lockedProcessingRate !== null) {
      lockedProcessingFee = Number(existing.quantity || 0) * lockedProcessingRate
    }
  }

  if (targetStage === "Delivered") {
    if (!deliveredAt) deliveredAt = extraData.deliveryDate || new Date().toISOString()
    if (extraData.storageFee !== undefined && extraData.storageFee !== null) {
      lockedStorageFee = Number(extraData.storageFee)
    }
    if (extraData.totalFee !== undefined && extraData.totalFee !== null) {
      lockedTotalFee = Number(extraData.totalFee)
    } else {
      lockedTotalFee = (lockedProcessingFee || 0) + (lockedStorageFee || 0)
    }
    if (lockedTotalFee > 0) {
      agreedPrice = lockedTotalFee
    }
  }

  // AUTOMATED REVENUE RECOGNITION WHEN STAGE REACHES 'Delivered'
  if (targetStage === "Delivered" && !existing.invoice_id) {
    invoiceId = `INV-PS-${id}`
    journalEntry = generateProcessingServiceRevenueJournalEntry({ ...existing, id, agreed_price: agreedPrice })

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
            description: `Toll processing & storage fee for ${existing.goods_description} (${existing.quantity} ${existing.uom})`,
            qty: Number(existing.quantity || 1),
            unit_price: Number(agreedPrice || 0) / Number(existing.quantity || 1),
            total: Number(agreedPrice || 0),
          }
        ],
        subtotal: Number(agreedPrice || 0),
        tax_amount: 0,
        discount_amount: 0,
        total_amount: Number(agreedPrice || 0),
        amount_paid: 0,
        balance_due: Number(agreedPrice || 0),
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

  const patchBody = {
    status: targetStage,
    status_history: history,
    invoice_id: invoiceId,
    locked_processing_rate: lockedProcessingRate,
    locked_processing_fee: lockedProcessingFee,
    locked_storage_fee: lockedStorageFee,
    locked_total_fee: lockedTotalFee,
    processed_at: processedAt,
    delivered_at: deliveredAt,
    agreed_price: agreedPrice,
    updated_at: new Date().toISOString(),
  }

  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    const response = await fetch(url, {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify(patchBody),
    })
    const rows = await parseResponse(response)
    const resultDoc = Array.isArray(rows) && rows.length > 0 ? rows[0] : { ...existing, ...patchBody }

    return {
      status: response.ok ? 200 : response.status,
      body: {
        ...resultDoc,
        ok: response.ok,
        journalEntry,
      },
    }
  } catch (err) {
    return { status: 500, body: { error: "Failed to transition stage in DB", message: err.message } }
  }
}

export async function deleteProcessingService(id) {
  try {
    const url = new URL("processing_services", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    const response = await fetch(url, { method: "DELETE", headers: headers() })
    if (response.ok) {
      return { status: 200, body: { ok: true, deletedId: id } }
    }
    const errBody = await parseResponse(response)
    return { status: response.status, body: errBody }
  } catch (err) {
    return { status: 500, body: { error: "Failed to delete processing service", message: err.message } }
  }
}
