export function calculateAmount(quantity, unitPrice) {
  const qty = Number(quantity)
  const price = Number(unitPrice)
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0
  return Math.round(qty * price * 100) / 100
}

export function parseExpiryDate(value) {
  if (!value || value === "N/A") return null
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number)
    return new Date(Date.UTC(year, month, 0))
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return null
}

export function isExpiredBatch(expiry, today = new Date()) {
  const expiryDate = parseExpiryDate(expiry)
  if (!expiryDate) return false
  const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  return expiryDate < current
}

export function availableBatchesForProduct(product, warehouseId, today = new Date()) {
  const warehouseQty = new Map((product.stockBreakdown || []).map((row) => [row.warehouse, Number(row.qty || 0)]))
  if (!warehouseQty.has(warehouseId)) return []

  return (product.batches || [])
    .map((batch) => ({
      batch_id: batch.batchNo,
      batch_no: batch.batchNo,
      item_id: product.id,
      item_name: product.name,
      warehouse_id: warehouseId,
      available_quantity: Number(batch.qty || 0),
      expiry: batch.expiry,
      unit_price: Number(product.sellingPrice || product.unitCost || 0),
      unit_cost: Number(product.unitCost || 0),
    }))
    .filter((batch) => batch.available_quantity > 0 && !isExpiredBatch(batch.expiry, today))
    .sort((a, b) => {
      const aDate = parseExpiryDate(a.expiry)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDate = parseExpiryDate(b.expiry)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aDate - bDate
    })
}

export function validateSalesIssueDraft(issue, items) {
  const errors = []
  if (!issue.fs_no) errors.push("FS No is required.")
  if (!issue.reference_no) errors.push("Reference is required.")
  if (!issue.sale_date) errors.push("Date is required.")
  if (!issue.customer_id) errors.push("Customer is required.")
  if (!issue.warehouse_id) errors.push("Warehouse is required.")
  if (!["Cash", "Credit"].includes(issue.payment_type)) errors.push("Payment Type must be Cash or Credit.")
  if (!Array.isArray(items) || items.length === 0) errors.push("At least one item row is required.")

  for (const [index, item] of (items || []).entries()) {
    const label = `Row ${index + 1}`
    if (!item.item_id) errors.push(`${label}: Item is required.`)
    if (!item.batch_id && !item.batch_no) errors.push(`${label}: Batch is required.`)
    if (Number(item.quantity) <= 0) errors.push(`${label}: Quantity must be greater than zero.`)
    if (Number(item.unit_price) < 0) errors.push(`${label}: Unit price must be greater than or equal to zero.`)
  }

  return errors
}

export function assertBalancedJournal(lines) {
  const debit = lines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0)
  const credit = lines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0)
  return Math.round((debit - credit) * 100) === 0
}

export function postSalesIssueInMemory(state, issueId, today = new Date()) {
  const issue = state.salesIssues.find((entry) => entry.id === issueId)
  if (!issue) throw new Error("Sales issue not found.")
  if (issue.status === "Posted") throw new Error("Sales issue has already been posted.")
  if (issue.status === "Cancelled") throw new Error("Cancelled sales issue cannot be posted.")

  const items = state.salesIssueItems.filter((item) => item.sales_issue_id === issueId)
  const errors = validateSalesIssueDraft(issue, items)
  if (errors.length) throw new Error(errors[0])

  let totalCost = 0
  let totalQuantity = 0
  let totalAmount = 0

  for (const item of items) {
    const product = state.products.find((entry) => entry.id === item.item_id)
    if (!product) throw new Error(`Item ${item.item_id} does not exist.`)
    const batch = product.batches.find((entry) => entry.batchNo === item.batch_no)
    if (!batch) throw new Error(`Batch ${item.batch_no} does not exist.`)
    if (isExpiredBatch(batch.expiry, today)) throw new Error(`Batch ${item.batch_no} is expired and cannot be sold.`)
    if (Number(item.quantity) > Number(batch.qty)) throw new Error(`Quantity exceeds available batch balance for ${item.batch_no}.`)
    const stockRow = product.stockBreakdown.find((entry) => entry.warehouse === issue.warehouse_id)
    if (!stockRow || Number(item.quantity) > Number(stockRow.qty)) throw new Error(`Quantity exceeds warehouse balance for ${issue.warehouse_id}.`)

    item.amount = calculateAmount(item.quantity, item.unit_price)
    batch.qty = Number(batch.qty) - Number(item.quantity)
    stockRow.qty = Number(stockRow.qty) - Number(item.quantity)
    product.quantity = Math.max(0, Number(product.quantity || 0) - Number(item.quantity))
    totalCost += Number(item.quantity) * Number(product.unitCost || 0)
    totalQuantity += Number(item.quantity)
    totalAmount += item.amount

    state.stockMovements.push({
      id: `SM-SALE-${issue.id}-${item.id}`,
      type: "SALES_OUT",
      productId: item.item_id,
      productName: item.item_name,
      fromWarehouse: issue.warehouse_id,
      qty: Number(item.quantity),
      reference: issue.fs_no,
    })
  }

  const salesLines = [
    { debit_amount: totalAmount, credit_amount: 0 },
    { debit_amount: 0, credit_amount: totalAmount },
  ]
  const costLines = [
    { debit_amount: totalCost, credit_amount: 0 },
    { debit_amount: 0, credit_amount: totalCost },
  ]
  if (!assertBalancedJournal(salesLines) || !assertBalancedJournal(costLines)) {
    throw new Error("Journal entry is not balanced.")
  }

  issue.total_quantity = totalQuantity
  issue.total_amount = totalAmount
  issue.status = "Posted"
  issue.posted_at = today.toISOString()
  if (issue.payment_type === "Credit") {
    state.customerReceivables.push({ sales_issue_id: issue.id, customer_id: issue.customer_id, balance: totalAmount })
  }
  return issue
}
