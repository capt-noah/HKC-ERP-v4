import { db } from "../../db/client.js"
import { shipmentDocuments } from "../../db/schema/index.js"
import { eq, and, desc } from "drizzle-orm"
import { DEFAULT_SHIPMENT_DOC_RULES, evaluateShipmentDocs } from "./shipmentDocumentLogic.js"

export async function listShipmentDocRules(query = {}) {
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
    const conditions = []
    if (recordId) conditions.push(eq(shipmentDocuments.recordId, recordId))
    if (recordType) conditions.push(eq(shipmentDocuments.recordType, recordType))

    let q = db.select().from(shipmentDocuments).orderBy(desc(shipmentDocuments.uploadedAt))
    if (conditions.length === 1) {
      q = db.select().from(shipmentDocuments).where(conditions[0]).orderBy(desc(shipmentDocuments.uploadedAt))
    } else if (conditions.length > 1) {
      q = db.select().from(shipmentDocuments).where(and(...conditions)).orderBy(desc(shipmentDocuments.uploadedAt))
    }

    const rows = await q
    return { status: 200, body: rows }
  } catch (err) {
    console.error("[DRIZZLE DOCS LIST ERROR]:", err.message)
    return { status: 500, body: { error: "Failed to list shipment documents", message: err.message } }
  }
}

export async function saveShipmentDoc(input) {
  const id = input?.id || `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const recordId = input?.record_id || input?.recordId || ""
  const documentType = input?.document_type || input?.documentType || "Other"

  const doc = {
    id,
    recordId,
    recordType: input?.record_type || input?.recordType || "purchase_order",
    documentType,
    fileName: input?.file_name || input?.fileName || "document.pdf",
    fileSize: String(Number(input?.file_size || input?.fileSize || 1024)),
    fileUrl: input?.file_url || input?.fileUrl || "",
    uploadedAt: input?.uploaded_at ? new Date(input.uploaded_at) : new Date(),
    uploadedBy: input?.uploaded_by || "Current User",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  try {
    // Delete duplicate document of same type for record_id
    await db
      .delete(shipmentDocuments)
      .where(and(eq(shipmentDocuments.recordId, recordId), eq(shipmentDocuments.documentType, documentType)))

    const inserted = await db.insert(shipmentDocuments).values(doc).returning()
    const resultDoc = inserted.length > 0 ? inserted[0] : doc
    return { status: 200, body: resultDoc }
  } catch (err) {
    console.error("[DRIZZLE DOCS SAVE ERROR]:", err.message)
    return { status: 500, body: { error: "Failed to save shipment document", message: err.message } }
  }
}

export async function listAssignedOfficers() {
  return { status: 200, body: [] }
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

  return { status: 200, body: assignment }
}

export async function deleteShipmentDoc(id) {
  try {
    await db.delete(shipmentDocuments).where(eq(shipmentDocuments.id, id))
    return { status: 200, body: { ok: true, deletedId: id } }
  } catch (err) {
    console.error(`[DRIZZLE DOCS DELETE ERROR] ${id}:`, err.message)
    return { status: 500, body: { error: "Failed to delete shipment doc", message: err.message } }
  }
}

export { evaluateShipmentDocs, DEFAULT_SHIPMENT_DOC_RULES }
