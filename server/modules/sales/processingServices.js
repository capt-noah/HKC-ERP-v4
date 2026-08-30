import { db } from "../../db/client.js"
import {
  processingServices,
  invoices,
  journalEntries,
  journalEntryLines,
} from "../../db/schema/index.js"
import { eq, desc } from "drizzle-orm"
import {
  generateProcessingServiceRevenueJournalEntry,
  validateProcessingServiceOrder,
  VALID_PROCESSING_STAGES,
} from "./processingServicesLogic.js"

export async function listProcessingServices(query = {}) {
  try {
    let q = db.select().from(processingServices).orderBy(desc(processingServices.createdAt))

    if (query.status) {
      q = db
        .select()
        .from(processingServices)
        .where(eq(processingServices.status, query.status))
        .orderBy(desc(processingServices.createdAt))
    }

    const rows = await q
    return { status: 200, body: rows }
  } catch (err) {
    console.error("[DRIZZLE PS LIST ERROR]:", err.message)
    return { status: 500, body: { error: "Failed to list processing services", message: err.message } }
  }
}

export async function getProcessingService(id) {
  try {
    const rows = await db
      .select()
      .from(processingServices)
      .where(eq(processingServices.id, id))
      .limit(1)

    if (rows.length > 0) {
      return { status: 200, body: rows[0] }
    }
    return { status: 404, body: { error: `Processing service '${id}' not found.` } }
  } catch (err) {
    console.error(`[DRIZZLE PS GET ERROR] ${id}:`, err.message)
    return { status: 500, body: { error: `Failed to get processing service '${id}'`, message: err.message } }
  }
}

export async function createProcessingService(input) {
  const errors = validateProcessingServiceOrder(input)
  if (errors.length > 0) {
    return { status: 400, body: { error: "Validation failed", details: errors } }
  }

  const id = input?.id || `PS-${Date.now().toString().slice(-5)}`
  const referenceNumber = input?.reference_number || input?.referenceNumber || id
  const clientCompanyName = input?.client_company_name || input?.customer_name || input?.clientName || "Client Company"

  const doc = {
    id,
    referenceNumber,
    clientCompanyName,
    customerId: input?.customer_id || null,
    goodsDescription: input?.goods_description || "Raw Agricultural Commodity",
    quantity: String(Number(input?.quantity || 1)),
    uom: input?.uom || "Quintal",
    entryDate: input?.entry_date || input?.entryDate || new Date().toISOString().split("T")[0],
    agreedPrice: String(Number(input?.agreed_price || input?.agreedPrice || 0)),
    currency: input?.currency || "ETB",
    status: "Received",
    statusHistory: [
      { stage: "Received", timestamp: new Date().toISOString() },
    ],
    assignedTo: input?.assigned_to || input?.assignedTo || null,
    invoiceId: null,
    notes: input?.notes || "",
    contractUrl: input?.contract_url || null,
    contractFileName: input?.contract_file_name || null,
    lockedProcessingRate: input?.locked_processing_rate ? String(input.locked_processing_rate) : null,
    lockedProcessingFee: input?.locked_processing_fee ? String(input.locked_processing_fee) : null,
    lockedStorageFee: input?.locked_storage_fee ? String(input.locked_storage_fee) : null,
    lockedTotalFee: input?.locked_total_fee ? String(input.locked_total_fee) : null,
    processedAt: input?.processed_at ? new Date(input.processed_at) : null,
    deliveredAt: input?.delivered_at ? new Date(input.delivered_at) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  try {
    const inserted = await db.insert(processingServices).values(doc).returning()
    const resultDoc = inserted.length > 0 ? inserted[0] : doc
    return { status: 200, body: resultDoc }
  } catch (err) {
    console.error("[DRIZZLE PS CREATE ERROR]:", err.message)
    return { status: 500, body: { error: "Failed to create processing service", message: err.message } }
  }
}

export async function updateProcessingService(input, id) {
  const getRes = await getProcessingService(id)
  if (getRes.status >= 400 || !getRes.body) {
    return { status: 404, body: { error: `Processing service '${id}' not found.` } }
  }

  const patchFields = {
    updatedAt: new Date(),
  }

  if (input.reference_number || input.referenceNumber) patchFields.referenceNumber = input.reference_number || input.referenceNumber
  if (input.client_company_name || input.customer_name || input.clientName) patchFields.clientCompanyName = input.client_company_name || input.customer_name || input.clientName
  if (input.customer_id) patchFields.customerId = input.customer_id
  if (input.goods_description) patchFields.goodsDescription = input.goods_description
  if (input.quantity !== undefined) patchFields.quantity = String(Number(input.quantity))
  if (input.uom) patchFields.uom = input.uom
  if (input.entry_date || input.entryDate) patchFields.entryDate = input.entry_date || input.entryDate
  if (input.agreed_price !== undefined || input.agreedPrice !== undefined) patchFields.agreedPrice = String(Number(input.agreed_price ?? input.agreedPrice))
  if (input.currency) patchFields.currency = input.currency
  if (input.status) patchFields.status = input.status
  if (input.status_history) patchFields.statusHistory = input.status_history
  if (input.assigned_to || input.assignedTo) patchFields.assignedTo = input.assigned_to || input.assignedTo
  if (input.notes !== undefined) patchFields.notes = input.notes
  if (input.contract_url !== undefined) patchFields.contractUrl = input.contract_url
  if (input.contract_file_name !== undefined) patchFields.contractFileName = input.contract_file_name

  try {
    const updated = await db
      .update(processingServices)
      .set(patchFields)
      .where(eq(processingServices.id, id))
      .returning()

    const resultDoc = updated.length > 0 ? updated[0] : { ...getRes.body, ...patchFields }
    return { status: 200, body: resultDoc }
  } catch (err) {
    console.error(`[DRIZZLE PS UPDATE ERROR] ${id}:`, err.message)
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
  const history = Array.isArray(existing.statusHistory || existing.status_history)
    ? [...(existing.statusHistory || existing.status_history)]
    : []
  history.push({ stage: targetStage, timestamp: new Date().toISOString() })

  let invoiceId = existing.invoiceId || existing.invoice_id
  let journalEntry = null

  // Rate locking parameters
  let lockedProcessingRate = existing.lockedProcessingRate ?? existing.locked_processing_rate ?? null
  let lockedProcessingFee = existing.lockedProcessingFee ?? existing.locked_processing_fee ?? null
  let lockedStorageFee = existing.lockedStorageFee ?? existing.locked_storage_fee ?? null
  let lockedTotalFee = existing.lockedTotalFee ?? existing.locked_total_fee ?? null
  let processedAt = existing.processedAt ? new Date(existing.processedAt) : null
  let deliveredAt = existing.deliveredAt ? new Date(existing.deliveredAt) : null
  let agreedPrice = Number(existing.agreedPrice || existing.agreed_price || 0)

  if (targetStage === "Processed") {
    if (!processedAt) processedAt = new Date()
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
    if (!deliveredAt) deliveredAt = extraData.deliveryDate ? new Date(extraData.deliveryDate) : new Date()
    if (extraData.storageFee !== undefined && extraData.storageFee !== null) {
      lockedStorageFee = Number(extraData.storageFee)
    }
    if (extraData.totalFee !== undefined && extraData.totalFee !== null) {
      lockedTotalFee = Number(extraData.totalFee)
    } else {
      lockedTotalFee = (Number(lockedProcessingFee) || 0) + (Number(lockedStorageFee) || 0)
    }
    if (lockedTotalFee > 0) {
      agreedPrice = Number(lockedTotalFee)
    }
  }

  // AUTOMATED REVENUE RECOGNITION WHEN STAGE REACHES 'Delivered'
  if (targetStage === "Delivered" && !invoiceId) {
    invoiceId = `INV-PS-${id}`
    journalEntry = generateProcessingServiceRevenueJournalEntry({ ...existing, id, agreed_price: agreedPrice })

    // Save invoice via Drizzle
    try {
      const clientName = existing.clientCompanyName || existing.client_company_name || "Client Company"
      const invoicePayload = {
        id: invoiceId,
        invoice_number: invoiceId,
        customer_name: clientName,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        line_items: [
          {
            description: `Toll processing & storage fee for ${existing.goodsDescription || existing.goods_description} (${existing.quantity} ${existing.uom})`,
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

      await db.insert(invoices).values({
        id: invoiceId,
        payload: invoicePayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing()
    } catch (err) {
      console.warn("Failed to persist service invoice via Drizzle:", err.message)
    }

    // Save journal entry & lines via Drizzle
    try {
      await db.insert(journalEntries).values({
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
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing()

      for (let idx = 0; idx < journalEntry.lines.length; idx++) {
        const l = journalEntry.lines[idx]
        const lineId = `${journalEntry.id}-${idx + 1}`
        await db.insert(journalEntryLines).values({
          id: lineId,
          payload: {
            id: lineId,
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
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing()
      }
    } catch (err) {
      console.warn("Failed to persist service journal entry via Drizzle:", err.message)
    }
  }

  const patchBody = {
    status: targetStage,
    statusHistory: history,
    invoiceId,
    lockedProcessingRate: lockedProcessingRate ? String(lockedProcessingRate) : null,
    lockedProcessingFee: lockedProcessingFee ? String(lockedProcessingFee) : null,
    lockedStorageFee: lockedStorageFee ? String(lockedStorageFee) : null,
    lockedTotalFee: lockedTotalFee ? String(lockedTotalFee) : null,
    processedAt: processedAt ? new Date(processedAt) : null,
    deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
    agreedPrice: String(agreedPrice),
    updatedAt: new Date(),
  }

  try {
    const updated = await db
      .update(processingServices)
      .set(patchBody)
      .where(eq(processingServices.id, id))
      .returning()

    const resultDoc = updated.length > 0 ? updated[0] : { ...existing, ...patchBody }

    return {
      status: 200,
      body: {
        ...resultDoc,
        ok: true,
        journalEntry,
      },
    }
  } catch (err) {
    console.error(`[DRIZZLE PS TRANSITION ERROR] ${id}:`, err.message)
    return { status: 500, body: { error: "Failed to transition stage via Drizzle", message: err.message } }
  }
}

export async function deleteProcessingService(id) {
  try {
    await db.delete(processingServices).where(eq(processingServices.id, id))
    return { status: 200, body: { ok: true, deletedId: id } }
  } catch (err) {
    console.error(`[DRIZZLE PS DELETE ERROR] ${id}:`, err.message)
    return { status: 500, body: { error: "Failed to delete processing service", message: err.message } }
  }
}
