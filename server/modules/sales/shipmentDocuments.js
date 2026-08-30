import { config } from "../../config.js"
import { DEFAULT_SHIPMENT_DOC_RULES, evaluateShipmentDocs } from "./shipmentDocumentLogic.js"

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

export async function listShipmentDocRules(query = {}) {
  try {
    const url = new URL("shipment_document_rules", config.supabaseRestUrl)
    url.searchParams.set("select", "*")
    if (query.applies_to) {
      url.searchParams.set("applies_to", `eq.${query.applies_to}`)
    }
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows }
    }
  } catch (err) {
    console.warn("listShipmentDocRules DB warning:", err.message)
  }

  let rules = DEFAULT_SHIPMENT_DOC_RULES
  if (query.applies_to) {
    rules = rules.filter((r) => r.applies_to === query.applies_to)
  }
  return { status: 200, body: rules }
}

export async function listShipmentDocs(query = {}) {
  const recordId = query.record_id || query.recordId || null
  const recordType = query.record_type || query.recordType || null

  try {
    const url = new URL("shipment_documents", config.supabaseRestUrl)
    url.searchParams.set("select", "*")
    if (recordId) {
      url.searchParams.set("record_id", `eq.${recordId}`)
    }
    if (recordType) {
      url.searchParams.set("record_type", `eq.${recordType}`)
    }
    url.searchParams.set("order", "uploaded_at.desc")
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows)) {
      return { status: 200, body: rows }
    }
    return { status: response.status || 500, body: rows || [] }
  } catch (err) {
    return { status: 500, body: { error: "Failed to list shipment documents", message: err.message } }
  }
}

export async function saveShipmentDoc(input) {
  const id = input?.id || `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const doc = {
    id,
    record_id: input?.record_id || input?.recordId || "",
    record_type: input?.record_type || input?.recordType || "purchase_order",
    document_type: input?.document_type || input?.documentType || "Other",
    file_name: input?.file_name || input?.fileName || "document.pdf",
    file_size: Number(input?.file_size || input?.fileSize || 1024),
    file_url: input?.file_url || input?.fileUrl || "",
    uploaded_at: input?.uploaded_at || new Date().toISOString(),
    uploaded_by: input?.uploaded_by || "Current User",
  }

  try {
    const url = new URL("shipment_documents", config.supabaseRestUrl)
    // Clean up previous doc of same type for record_id
    try {
      const delUrl = new URL("shipment_documents", config.supabaseRestUrl)
      delUrl.searchParams.set("record_id", `eq.${doc.record_id}`)
      delUrl.searchParams.set("document_type", `eq.${doc.document_type}`)
      await fetch(delUrl, { method: "DELETE", headers: headers() })
    } catch {}

    const response = await fetch(url, {
      method: "POST",
      headers: headers("return=representation"),
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
    return { status: 500, body: { error: "Failed to save shipment document", message: err.message } }
  }
}

export async function listAssignedOfficers() {
  try {
    const url = new URL("shipment_document_officers", config.supabaseRestUrl)
    url.searchParams.set("select", "*")
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows)) {
      return { status: 200, body: rows }
    }
    return { status: response.status || 500, body: rows || [] }
  } catch (err) {
    return { status: 500, body: { error: "Failed to list assigned officers", message: err.message } }
  }
}

export async function assignOfficer(input) {
  const record_id = input?.record_id || input?.recordId
  if (!record_id) {
    return { status: 400, body: { error: "record_id is required" } }
  }

  const assignment = {
    record_id,
    assigned_employee_id: input?.assigned_employee_id || input?.assignedEmployeeId || null,
    assigned_employee_name: input?.assigned_employee_name || input?.assignedEmployeeName || "Unassigned",
    assigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const url = new URL("shipment_document_officers", config.supabaseRestUrl)
    const response = await fetch(url, {
      method: "POST",
      headers: headers("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(assignment),
    })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows) && rows.length > 0) {
      return { status: 200, body: rows[0] }
    }
    if (!response.ok) {
      return { status: response.status, body: rows }
    }
    return { status: 200, body: assignment }
  } catch (err) {
    return { status: 500, body: { error: "Failed to assign officer in DB", message: err.message } }
  }
}

export async function deleteShipmentDoc(id) {
  try {
    const url = new URL("shipment_documents", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    const response = await fetch(url, { method: "DELETE", headers: headers() })
    if (response.ok) {
      return { status: 200, body: { ok: true, deletedId: id } }
    }
    const errBody = await parseResponse(response)
    return { status: response.status, body: errBody }
  } catch (err) {
    return { status: 500, body: { error: "Failed to delete shipment doc", message: err.message } }
  }
}

export { evaluateShipmentDocs, DEFAULT_SHIPMENT_DOC_RULES }
