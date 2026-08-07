import { config } from "../../config.js"
import { DEFAULT_SHIPMENT_DOC_RULES, evaluateShipmentDocs } from "./shipmentDocumentLogic.js"

const memoryShipmentDocs = new Map()
const memoryRules = new Map(DEFAULT_SHIPMENT_DOC_RULES.map((r) => [r.id, r]))

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

  let rules = Array.from(memoryRules.values())
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
    const response = await fetch(url, { headers: headers() })
    const rows = await parseResponse(response)
    if (response.ok && Array.isArray(rows)) {
      return { status: 200, body: rows }
    }
  } catch (err) {
    console.warn("listShipmentDocs DB warning:", err.message)
  }

  let docs = Array.from(memoryShipmentDocs.values())
  if (recordId) {
    docs = docs.filter((d) => d.record_id === recordId)
  }
  if (recordType) {
    docs = docs.filter((d) => d.record_type === recordType)
  }

  return { status: 200, body: docs }
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

  memoryShipmentDocs.set(id, doc)

  try {
    const url = new URL("shipment_documents", config.supabaseRestUrl)
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
    console.warn("saveShipmentDoc DB warning:", err.message)
  }

  return { status: 200, body: doc }
}

const memoryAssignedOfficers = new Map([
  [
    "PO-2026-089",
    {
      record_id: "PO-2026-089",
      assigned_employee_id: "EMP-004",
      assigned_employee_name: "Tadesse Worku (Customs Compliance Officer)",
      assigned_at: new Date().toISOString(),
    },
  ],
])

export async function listAssignedOfficers() {
  const list = Array.from(memoryAssignedOfficers.values())
  return { status: 200, body: list }
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
  }

  memoryAssignedOfficers.set(record_id, assignment)
  return { status: 200, body: assignment }
}

export async function deleteShipmentDoc(id) {
  memoryShipmentDocs.delete(id)

  try {
    const url = new URL("shipment_documents", config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)
    await fetch(url, { method: "DELETE", headers: headers() })
  } catch (err) {
    console.warn("deleteShipmentDoc DB warning:", err.message)
  }

  return { status: 200, body: { ok: true, deletedId: id } }
}

export { evaluateShipmentDocs, DEFAULT_SHIPMENT_DOC_RULES }
