import { useState, useEffect } from "react"
import { createResource, deleteResource, loadResource, persistResources, updateResource } from "./apiPersistence"
import { useAuthStore } from "./authStore"
import { financeStore } from "./financeStore"
import { evaluateStockStatus } from "../core/inventory/stockEngine"
import { validateTransferNote } from "../core/inventory/transferEngine"
import { processSalesOrderPipeline } from "../core/sales/orderPipeline"

export interface Warehouse {
  id: string
  name: string
  code: string
  location: string
  type: string
  specialization: string
  targetMarkets: string
  manager: string
  status: string
}

export interface StockBreakdown {
  warehouse: string
  qty: number
}

export interface BatchInfo {
  batchNo: string
  qty: number
  expiry: string
  status: "Released" | "Pending QA" | "Quarantined"
}

export interface WH1Entry {
  entryId: string
  entryDate: string
  leaveDate?: string
  quantityReceived: number
  quantityRemaining: number
  unitPrice: number
  notes?: string
}

export interface BinCardMovementEntry {
  id: string
  date: string
  batchNo: string
  qtyReceived: number
  qtyIssued: number
  balance: number
  expiryDate: string
  party: string
  unitPrice?: number
  remark: string
  createdAt?: string
}

export interface Product {
  id: string
  name: string
  sku: string
  dosage?: string
  shelfNo?: string
  category: string
  itemType?: string
  description?: string
  warehouse: string
  warehouseName?: string
  quantity: number
  quantityPerPack?: number
  numberOfCartons?: number
  totalQuantity?: number
  quantitySold?: number
  openingBalance?: number
  reorderLevel?: number
  reorderQuantity?: number
  valuationRate?: number
  unit: string
  unitCost: number
  totalStockValue?: number
  sellingPrice: number
  batch: string
  manufacturingDate?: string
  expiry: string
  entryDate?: string
  leaveDate?: string
  shelfLifeMonths?: number
  expiryAlertEnabled?: boolean
  expiryAlertPeriod?: string
  status: "In Stock" | "Low Stock" | "Quarantined" | "Out of Stock" | "Pending QA"
  stockBreakdown: StockBreakdown[]
  batches: BatchInfo[]
  wh1Entries?: WH1Entry[]
  binCardEntries?: BinCardMovementEntry[]
  origin: string
  supplierName: string
  inventoryAssetAccount?: string
  cogsAccount?: string
  revenueAccount?: string
  damageExpenseAccount?: string
  taxCategory?: string
  trackBatchNumber?: boolean
  trackManufacturingDate?: boolean
  trackExpiryDate?: boolean
  trackSerialNumber?: boolean
  allowDecimalCartons?: boolean
  preventNegativeStock?: boolean
  requireApprovalBeforeActivation?: boolean
  productImageName?: string
  supportingDocumentName?: string
  internalNotes?: string
  itemRegistrationStatus?: "Draft" | "Submitted" | "Active"
  approvalStatus?: "Not Submitted" | "Submitted" | "Approved"
  createdBy?: string
  createdDate?: string
  createdAt?: string
  updatedAt?: string
}

export type TransferStatus = "Issued" | "Received" | "Discrepancy"

export interface TransferLineItem {
  line_no: number
  item: string
  UOM: string
  quantity: number
  remark?: string
}

export interface Transfer {
  reference_number: string
  from_warehouse: string
  to_warehouse: string
  status: TransferStatus
  line_items: TransferLineItem[]
  total_quantity: number
  issued_by?: string
  issued_at?: string
  received_by?: string
  received_at?: string
  discrepancy_remark?: string
  issued_signature?: string
  received_signature?: string
  date: string
  journalEntryId?: string
}

type PersistedTransfer = Transfer & { id?: string }

export interface StockMovementLog {
  id: string
  date: string
  type: "TRANSFER" | "ADJUSTMENT" | "RECEIPT" | "FULFILLMENT" | "SALES_OUT"
  productId?: string
  productName: string
  sku?: string
  fromWarehouse?: string
  toWarehouse?: string
  qty: number
  unit: string
  reference: string
  journalEntryId?: string
  remarks?: string
}

export interface SalesOrderItem {
  productId: string
  name: string
  qty: number
  unit: string
  unitPrice: number
  total: number
  deliveredQty?: number
}

export interface Quotation {
  id: string
  customer: string
  customerId: string
  customerGroup?: string
  warehouse: string
  warehouseName?: string
  date: string
  validTill: string
  amount: number
  currency: string
  status: "Draft" | "Quoted" | "Ordered" | "Expired" | "Cancelled"
  desc: string
  paymentTerms?: string
  salesPerson?: string
  items: SalesOrderItem[]
}

export interface DeliveryNoteItem {
  productId: string
  name: string
  qty: number
  unit: string
  unitCost: number
  unitPrice: number
  totalValue: number
}

export interface DeliveryNote {
  id: string
  salesOrderId: string
  customer: string
  customerId: string
  warehouse: string
  warehouseName?: string
  postingDate: string
  driverName?: string
  vehicleReg?: string
  status: "Draft" | "Submitted" | "Cancelled"
  items: DeliveryNoteItem[]
  totalValue: number
  cogsTotal: number
  journalEntryId?: string
}

export interface SalesOrder {
  id: string
  quotationId?: string
  customer: string
  customerId: string
  customerPhone?: string
  customerGroup?: string
  warehouse: string
  warehouseName?: string
  date: string
  deliveryDate?: string
  amount: number
  currency: string
  stage: "Quote" | "Confirmed" | "Picking" | "Shipped" | "Delivered" | "Cancelled"
  progress?: number
  desc: string
  initials: string
  label: string
  avatarBg: string
  urgent: boolean
  attachment: boolean
  items: SalesOrderItem[]
  // ERPNext Sales alignment fields
  deliveredAmount?: number
  billedAmount?: number
  deliveryStatus?: "Not Delivered" | "Partially Delivered" | "Fully Delivered"
  billingStatus?: "Not Billed" | "Partially Billed" | "Fully Billed"
  paymentTerms?: string
  paymentType?: "Cash" | "Credit"
  salesPerson?: string
  shippingAddress?: string
  deliveryNoteIds?: string[]
  invoiceIds?: string[]
}

export interface PurchaseOrderItem {
  productId: string
  name: string
  sku: string
  qty: number
  unit: string
  unitPrice: number
  total: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplier: string
  supplierId: string
  warehouse: string
  warehouseName?: string
  status: "DRAFT" | "IN TRANSIT" | "RECEIVED" | "CANCELLED"
  statusColor: string
  date: string
  requiredByDate?: string
  eta: string
  amount: number
  currency: string
  category: string
  items: PurchaseOrderItem[]
  receivedAmount?: number
  billedAmount?: number
  receiptStatus?: "Not Received" | "Partially Received" | "Fully Received"
  billingStatus?: "Not Billed" | "Partially Billed" | "Fully Billed"
  receiptIds?: string[]
  invoiceIds?: string[]
}

export interface Customer {
  id: string
  name: string
  country: string
  region?: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  category?: string
  warehouseTarget?: string
  creditLimit?: number
  tradePaperUrl?: string
  tradePaperFileName?: string
  tradePaperUploadedAt?: string
  status?: string
}

export function getTradeLicenseStatus(customer: Customer): {
  status: "valid" | "expired" | "missing"
  daysRemaining: number
} {
  if (!customer.tradePaperUrl || !customer.tradePaperFileName) {
    return { status: "missing", daysRemaining: 0 }
  }
  if (!customer.tradePaperUploadedAt) {
    return { status: "expired", daysRemaining: 0 }
  }
  const uploadedDate = new Date(customer.tradePaperUploadedAt)
  const expiryDate = new Date(uploadedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const today = new Date()
  const diffMs = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) {
    return { status: "expired", daysRemaining: 0 }
  }
  return { status: "valid", daysRemaining: diffDays }
}

export interface Supplier {
  id: string
  name: string
  country: string
  city?: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  category?: string
  taxId?: string
  warehouseTarget?: string
  rating?: string
  tradePaperUrl?: string
  tradePaperFileName?: string
  status?: string
}

class ErpStore {
  private warehouses: Warehouse[] = []
  private products: Product[] = []
  private salesOrders: SalesOrder[] = []
  private purchaseOrders: PurchaseOrder[] = []
  private customers: Customer[] = []
  private suppliers: Supplier[] = []
  private quotations: Quotation[] = []
  private deliveryNotes: DeliveryNote[] = []
  private transfers: Transfer[] = []
  private stockMovements: StockMovementLog[] = []

  private listeners = new Set<() => void>()
  private loading = true
  private _loadError: string | null = null

  constructor() {
    this.loadFromApi()
  }

  private async loadFromApi() {
    if (!useAuthStore.getState().token) {
      this.loading = false
      return
    }
    this.loading = true
    this._loadError = null
    this.listeners.forEach((l) => l())
    try {
      const [
        warehouses,
        products,
        salesOrders,
        purchaseOrders,
        customers,
        suppliers,
        quotations,
        deliveryNotes,
        transfers,
        stockMovements,
      ] = await Promise.all([
        loadResource<Warehouse>("warehouses"),
        loadResource<Product>("inventory_products"),
        loadResource<SalesOrder>("sales_orders"),
        loadResource<PurchaseOrder>("purchase_orders"),
        loadResource<Customer>("customers"),
        loadResource<Supplier>("suppliers"),
        loadResource<Quotation>("quotations"),
        loadResource<DeliveryNote>("delivery_notes"),
        loadResource<PersistedTransfer>("store_transfers"),
        loadResource<StockMovementLog>("stock_movements"),
      ])

      this.warehouses = warehouses
      this.products = products.map((product) => this.withInventoryValue(product))
      this.salesOrders = salesOrders
      this.purchaseOrders = purchaseOrders
      this.customers = customers
      this.suppliers = suppliers
      this.quotations = quotations
      this.deliveryNotes = deliveryNotes
      this.transfers = transfers.map(({ id: _id, ...transfer }) => transfer as Transfer)
      this.stockMovements = stockMovements
      this._loadError = null
    } catch (error) {
      console.error("Failed to load ERP data from Supabase.", error)
      // Explicitly clear all state so stale data is not shown
      this.warehouses = []
      this.products = []
      this.salesOrders = []
      this.purchaseOrders = []
      this.customers = []
      this.suppliers = []
      this.quotations = []
      this.deliveryNotes = []
      this.transfers = []
      this.stockMovements = []
      this._loadError = error instanceof Error ? error.message : "Could not connect to the server. ERP data is unavailable."
    } finally {
      this.loading = false
      this.listeners.forEach((l) => l())
    }
  }

  private saveToApi() {
    return persistResources([
      { resource: "warehouses", items: this.warehouses },
      { resource: "inventory_products", items: this.products },
      { resource: "sales_orders", items: this.salesOrders },
      { resource: "purchase_orders", items: this.purchaseOrders },
      { resource: "customers", items: this.customers },
      { resource: "suppliers", items: this.suppliers },
      { resource: "quotations", items: this.quotations },
      { resource: "delivery_notes", items: this.deliveryNotes },
      { resource: "store_transfers", items: this.transfers.map((transfer) => ({ id: transfer.reference_number, ...transfer })) },
      { resource: "stock_movements", items: this.stockMovements },
    ])
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public async reloadFromApi() {
    await this.loadFromApi()
  }

  public isLoading() {
    return this.loading
  }

  public getLoadError(): string | null {
    return this._loadError
  }

  private notify() {
    void this.saveToApi().catch((error) => {
      console.error("Failed to persist ERP data to Supabase.", error)
    })
    this.listeners.forEach((l) => l())
  }

  private withInventoryValue(product: Product): Product {
    const quantity = Number(product.quantity || 0)
    const unitCost = Number(product.unitCost || 0)
    return {
      ...product,
      totalStockValue: Math.round(quantity * unitCost * 100) / 100,
    }
  }

  // Getters
  public getWarehouses(): Warehouse[] {
    return [...this.warehouses]
  }

  public getProducts(): Product[] {
    return [...this.products]
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id)
  }

  public getSalesOrders(): SalesOrder[] {
    return [...this.salesOrders]
  }

  public getSalesOrderById(id: string): SalesOrder | undefined {
    return this.salesOrders.find((so) => so.id === id)
  }

  public getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders]
  }

  public getPurchaseOrderById(id: string): PurchaseOrder | undefined {
    return this.purchaseOrders.find((po) => po.id === id)
  }

  public getCustomers(): Customer[] {
    return [...this.customers]
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id)
  }

  public getSuppliers(): Supplier[] {
    return [...this.suppliers]
  }

  public getQuotations(): Quotation[] {
    return [...this.quotations]
  }

  public getDeliveryNotes(): DeliveryNote[] {
    return [...this.deliveryNotes]
  }

  public getTransfers(): Transfer[] {
    return [...this.transfers]
  }

  public getStockMovements(): StockMovementLog[] {
    return [...this.stockMovements]
  }

  public async addStockMovement(movement: StockMovementLog) {
    const savedMovement = await createResource<StockMovementLog>("stock_movements", movement)
    this.stockMovements = [savedMovement, ...this.stockMovements]
    this.listeners.forEach((l) => l())
  }

  public async recordStockReceipt(input: { productId: string; warehouse: string; quantity: number; remarks?: string }): Promise<StockMovementLog> {
    const product = this.products.find((item) => item.id === input.productId)
    if (!product) throw new Error("Product not found.")
    if (!input.warehouse) throw new Error("Receiving warehouse is required.")
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Receipt quantity must be greater than zero.")

    const existingEntry = product.stockBreakdown.find((entry) => entry.warehouse === input.warehouse)
    const nextBreakdown = existingEntry
      ? product.stockBreakdown.map((entry) => entry.warehouse === input.warehouse ? { ...entry, qty: Number(entry.qty || 0) + input.quantity } : entry)
      : [...product.stockBreakdown, { warehouse: input.warehouse, qty: input.quantity }]
    const nextQuantity = nextBreakdown.reduce((sum, entry) => sum + Number(entry.qty || 0), 0)
    const hasQuarantinedBatch = product.batches.some((batch) => batch.status === "Quarantined")
    const hasPendingBatch = product.batches.some((batch) => batch.status === "Pending QA")
    const nextStatus: Product["status"] = hasQuarantinedBatch
      ? "Quarantined"
      : hasPendingBatch
        ? "Pending QA"
        : nextQuantity <= 0
          ? "Out of Stock"
          : nextQuantity <= Number(product.reorderLevel || 0)
            ? "Low Stock"
            : "In Stock"
    const timestamp = Date.now()
    const movement: StockMovementLog = {
      id: `SM-${timestamp}`,
      date: new Date().toISOString(),
      type: "RECEIPT",
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      toWarehouse: input.warehouse,
      qty: input.quantity,
      unit: product.unit,
      reference: `RECEIPT-${timestamp}`,
      remarks: input.remarks,
    }

    const updatedProduct = this.withInventoryValue({ ...product, quantity: nextQuantity, stockBreakdown: nextBreakdown, status: nextStatus })
    const savedProduct = await updateResource<Product>("inventory_products", product.id, updatedProduct)
    const savedMovement = await createResource<StockMovementLog>("stock_movements", movement)
    const nextProducts = this.products.map((item) => item.id === product.id ? savedProduct : item)
    const nextMovements = [savedMovement, ...this.stockMovements]
    this.products = nextProducts
    this.stockMovements = nextMovements
    this.listeners.forEach((listener) => listener())
    return movement
  }

  // Inter-Warehouse Transfer Execution
  public addStockTransfer(transfer: Transfer): { success: boolean; journalEntryId?: string } {
    let transferVal = 0

    // Deduct stock from origin warehouse and add to destination breakdown
    transfer.line_items.forEach((item) => {
      const prod = this.products.find(
        (p) => p.name.toLowerCase().includes(item.item.toLowerCase()) || item.item.toLowerCase().includes(p.name.toLowerCase())
      )
      const valuation = prod ? prod.unitCost : 1000
      transferVal += item.quantity * valuation

      if (prod) {
        const updatedBreakdown = prod.stockBreakdown.map((sb) => {
          if (sb.warehouse === transfer.from_warehouse) {
            return { ...sb, qty: Math.max(0, sb.qty - item.quantity) }
          }
          if (sb.warehouse === transfer.to_warehouse) {
            return { ...sb, qty: sb.qty + item.quantity }
          }
          return sb
        })

        // Ensure destination warehouse exists in breakdown
        if (!updatedBreakdown.some((sb) => sb.warehouse === transfer.to_warehouse)) {
          updatedBreakdown.push({ warehouse: transfer.to_warehouse, qty: item.quantity })
        }

        this.updateProduct(prod.id, {
          stockBreakdown: updatedBreakdown,
        })
      }

      // Record Stock Movement Log
      this.stockMovements.unshift({
        id: `SM-${Date.now().toString().slice(-4)}`,
        date: transfer.date || new Date().toISOString().split("T")[0],
        type: "TRANSFER",
        productId: prod?.id,
        productName: item.item,
        fromWarehouse: transfer.from_warehouse,
        toWarehouse: transfer.to_warehouse,
        qty: item.quantity,
        unit: item.UOM,
        reference: transfer.reference_number,
        remarks: item.remark || `Transfer from ${transfer.from_warehouse} to ${transfer.to_warehouse}`,
      })
    })

    // Post Double-Entry Journal Voucher in Finance Store for inter-warehouse inventory asset transfer
    const stockAcc = financeStore.getAccounts().find((a) => a.code === "1010" || a.code === "1410" || a.name.includes("Stock")) || financeStore.getAccounts()[0]
    let jeId: string | undefined = undefined

    if (stockAcc && transferVal > 0) {
      const postRes = financeStore.postJournalEntry(
        {
          entry_date: transfer.date || new Date().toISOString().split("T")[0],
          description: `Inter-Warehouse Inventory Asset Transfer ${transfer.reference_number} (${transfer.from_warehouse} → ${transfer.to_warehouse})`,
          source_type: "Warehouse Transfer",
          source_id: transfer.reference_number,
          created_by: transfer.issued_by || "Warehouse Store Manager",
          currency: "ETB",
          exchange_rate: 1.0,
        },
        [
          { account_id: stockAcc.id, debit_amount: transferVal, credit_amount: 0, warehouse_id: transfer.to_warehouse },
          { account_id: stockAcc.id, debit_amount: 0, credit_amount: transferVal, warehouse_id: transfer.from_warehouse },
        ]
      )
      if (postRes.success && postRes.entry) {
        jeId = postRes.entry.id
        transfer.journalEntryId = jeId
      }
    }

    this.transfers.unshift(transfer)
    this.notify()
    return { success: true, journalEntryId: jeId }
  }

  public updateTransferStatus(refNum: string, status: TransferStatus, receivedBy?: string, remark?: string) {
    const todayStr = new Date().toISOString().replace("T", " ").substring(0, 16)
    this.transfers = this.transfers.map((t) => {
      if (t.reference_number !== refNum) return t
      return {
        ...t,
        status,
        received_by: receivedBy || t.received_by,
        received_at: todayStr,
        discrepancy_remark: remark || t.discrepancy_remark,
      }
    })
    this.notify()
  }

  // Stock Adjustment (Physical Count Audit & Valuation Adjustment with GL Journal Voucher)
  public adjustStock(
    productId: string,
    warehouse: string,
    newQty: number,
    reason: string
  ): { success: boolean; error?: string; journalEntryId?: string } {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) return { success: false, error: "Product not found" }

    const currentWQty = prod.stockBreakdown.find((sb) => sb.warehouse === warehouse)?.qty ?? prod.quantity
    const delta = newQty - currentWQty
    if (delta === 0) return { success: true }

    const unitCost = prod.unitCost || 1000
    const adjustmentVal = Math.abs(delta) * unitCost

    // Update Product Stock Breakdown & Total
    let updatedBreakdown = prod.stockBreakdown.map((sb) =>
      sb.warehouse === warehouse ? { ...sb, qty: newQty } : sb
    )
    if (!updatedBreakdown.some((sb) => sb.warehouse === warehouse)) {
      updatedBreakdown.push({ warehouse, qty: newQty })
    }

    const newTotalQty = updatedBreakdown.reduce((sum, sb) => sum + sb.qty, 0)
    const newStatus = newTotalQty === 0 ? "Out of Stock" : newTotalQty < (prod.reorderLevel || 100) ? "Low Stock" : "In Stock"

    this.updateProduct(productId, {
      quantity: newTotalQty,
      stockBreakdown: updatedBreakdown,
      totalStockValue: newTotalQty * unitCost,
      status: newStatus,
    })

    // Post GL Journal Entry for Stock Gain/Loss
    // Accounts: 1410 Stock In Hand, 5000/5010 Cost of Goods Sold / Inventory Adjustment Loss/Gain
    const stockAcc = financeStore.getAccounts().find((a) => a.code === "1410" || a.code === "1010" || a.name.includes("Stock")) || financeStore.getAccounts()[0]
    const adjAcc = financeStore.getAccounts().find((a) => a.code === "5000" || a.code === "5100" || a.account_type === "Expense") || financeStore.getAccounts()[1]

    let jeId: string | undefined = undefined
    if (stockAcc && adjAcc && adjustmentVal > 0) {
      const isGain = delta > 0
      const postRes = financeStore.postJournalEntry(
        {
          entry_date: new Date().toISOString().split("T")[0],
          description: `Stock Adjustment Audit for ${prod.name} (${warehouse}): ${isGain ? "Gain" : "Write-off/Loss"} of ${Math.abs(delta)} ${prod.unit} - Reason: ${reason}`,
          source_type: "Warehouse Transfer",
          source_id: `ADJ-${prod.id}`,
          created_by: "Inventory Control Auditor",
          currency: "ETB",
          exchange_rate: 1.0,
        },
        isGain
          ? [
              { account_id: stockAcc.id, debit_amount: adjustmentVal, credit_amount: 0, warehouse_id: warehouse },
              { account_id: adjAcc.id, debit_amount: 0, credit_amount: adjustmentVal, warehouse_id: warehouse },
            ]
          : [
              { account_id: adjAcc.id, debit_amount: adjustmentVal, credit_amount: 0, warehouse_id: warehouse },
              { account_id: stockAcc.id, debit_amount: 0, credit_amount: adjustmentVal, warehouse_id: warehouse },
            ]
      )
      if (postRes.success && postRes.entry) {
        jeId = postRes.entry.id
      }
    }

    // Log Stock Movement
    this.stockMovements.unshift({
      id: `SM-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split("T")[0],
      type: "ADJUSTMENT",
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      fromWarehouse: delta < 0 ? warehouse : undefined,
      toWarehouse: delta > 0 ? warehouse : undefined,
      qty: Math.abs(delta),
      unit: prod.unit,
      reference: `ADJ-${prod.id}`,
      journalEntryId: jeId,
      remarks: `Reason: ${reason}`,
    })

    this.notify()
    return { success: true, journalEntryId: jeId }
  }

  // Actions - Products
  public async addProduct(product: Product) {
    const savedProduct = await createResource<Product>("inventory_products", this.withInventoryValue(product))
    this.products = [savedProduct, ...this.products]
    this.listeners.forEach((l) => l())
  }

  public async deleteProduct(id: string) {
    const product = this.products.find((item) => item.id === id)
    const removedMovements = this.stockMovements.filter((movement) => movement.productId === id || movement.productName === product?.name)
    await Promise.all([
      deleteResource("inventory_products", id),
      ...removedMovements.map((movement) => deleteResource("stock_movements", movement.id)),
    ])
    const nextProducts = this.products.filter((item) => item.id !== id)
    const nextMovements = this.stockMovements.filter((movement) => movement.productId !== id && movement.productName !== product?.name)
    this.products = nextProducts
    this.stockMovements = nextMovements
    this.listeners.forEach((l) => l())
  }

  public updateProduct(id: string, partial: Partial<Product>) {
    this.products = this.products.map((p) => (p.id === id ? this.withInventoryValue({ ...p, ...partial }) : p))
    this.notify()
  }

  public async updateProductDetails(id: string, partial: Partial<Product>) {
    const currentProduct = this.products.find((product) => product.id === id)
    if (!currentProduct) throw new Error("Product not found")

    const updatedProduct = this.withInventoryValue({
      ...currentProduct,
      ...partial,
      updatedAt: new Date().toISOString(),
    })
    const savedProduct = await updateResource<Product>("inventory_products", id, updatedProduct)
    this.products = this.products.map((product) => (product.id === id ? savedProduct : product))
    this.listeners.forEach((listener) => listener())
    return savedProduct
  }

  public async addWH1Entry(productId: string, entry: Omit<WH1Entry, "entryId">) {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) throw new Error("Product not found")

    const newEntry: WH1Entry = {
      ...entry,
      entryId: `WH1E-${Date.now()}`,
    }

    const currentEntries = prod.wh1Entries || []
    const updatedEntries = [...currentEntries, newEntry]

    const nextQty = updatedEntries.reduce((sum, e) => sum + Number(e.quantityRemaining || 0), 0)
    const nextVal = updatedEntries.reduce((sum, e) => sum + (Number(e.quantityRemaining || 0) * Number(e.unitPrice || 0)), 0)
    const weightedCost = nextQty > 0 ? Math.round((nextVal / nextQty) * 100) / 100 : Number(prod.unitCost || 0)

    const updatedBreakdown = [{ warehouse: prod.warehouse, qty: nextQty }]
    const updatedBatches = [{ batchNo: prod.batch || "BATCH-WH1", qty: nextQty, expiry: "", status: "Released" as const }]

    await this.updateProductDetails(productId, {
      quantity: nextQty,
      totalQuantity: nextQty + (prod.quantitySold || 0),
      unitCost: weightedCost,
      sellingPrice: weightedCost,
      totalStockValue: nextVal,
      stockBreakdown: updatedBreakdown,
      batches: updatedBatches,
      wh1Entries: updatedEntries,
    })
  }

  public async updateWH1Entry(productId: string, entryId: string, patch: Partial<WH1Entry>) {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) throw new Error("Product not found")

    const currentEntries = prod.wh1Entries || []
    const updatedEntries = currentEntries.map((e) => {
      if (e.entryId !== entryId) return e
      const quantityReceived = patch.quantityReceived !== undefined ? Number(patch.quantityReceived) : e.quantityReceived
      const quantityRemaining = patch.quantityRemaining !== undefined ? Number(patch.quantityRemaining) : e.quantityRemaining
      const unitPrice = patch.unitPrice !== undefined ? Number(patch.unitPrice) : e.unitPrice
      return {
        ...e,
        ...patch,
        quantityReceived,
        quantityRemaining: Math.min(quantityReceived, quantityRemaining),
        unitPrice,
      }
    })

    const nextQty = updatedEntries.reduce((sum, e) => sum + Number(e.quantityRemaining || 0), 0)
    const nextVal = updatedEntries.reduce((sum, e) => sum + (Number(e.quantityRemaining || 0) * Number(e.unitPrice || 0)), 0)
    const weightedCost = nextQty > 0 ? Math.round((nextVal / nextQty) * 100) / 100 : Number(prod.unitCost || 0)

    const updatedBreakdown = [{ warehouse: prod.warehouse, qty: nextQty }]
    const updatedBatches = [{ batchNo: prod.batch || "BATCH-WH1", qty: nextQty, expiry: "", status: "Released" as const }]

    await this.updateProductDetails(productId, {
      quantity: nextQty,
      totalQuantity: nextQty + (prod.quantitySold || 0),
      unitCost: weightedCost,
      sellingPrice: weightedCost,
      totalStockValue: nextVal,
      stockBreakdown: updatedBreakdown,
      batches: updatedBatches,
      wh1Entries: updatedEntries,
    })
  }

  public async deleteWH1Entry(productId: string, entryId: string) {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) throw new Error("Product not found")

    const currentEntries = prod.wh1Entries || []
    const updatedEntries = currentEntries.filter((e) => e.entryId !== entryId)

    const nextQty = updatedEntries.reduce((sum, e) => sum + Number(e.quantityRemaining || 0), 0)
    const nextVal = updatedEntries.reduce((sum, e) => sum + (Number(e.quantityRemaining || 0) * Number(e.unitPrice || 0)), 0)
    const weightedCost = nextQty > 0 ? Math.round((nextVal / nextQty) * 100) / 100 : Number(prod.unitCost || 0)

    const updatedBreakdown = [{ warehouse: prod.warehouse, qty: nextQty }]
    const updatedBatches = [{ batchNo: prod.batch || "BATCH-WH1", qty: nextQty, expiry: "", status: "Released" as const }]

    await this.updateProductDetails(productId, {
      quantity: nextQty,
      totalQuantity: nextQty + (prod.quantitySold || 0),
      unitCost: weightedCost,
      sellingPrice: weightedCost,
      totalStockValue: nextVal,
      stockBreakdown: updatedBreakdown,
      batches: updatedBatches,
      wh1Entries: updatedEntries,
    })
  }

  public recalculateBinCardLedger(entries: BinCardMovementEntry[] = []) {
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let currentBalance = 0
    let totalReceived = 0
    let totalIssued = 0
    let latestBatch = ""
    let latestExpiry = ""

    const recalculatedEntries = sorted.map((entry) => {
      totalReceived += Number(entry.qtyReceived || 0)
      totalIssued += Number(entry.qtyIssued || 0)
      currentBalance += Number(entry.qtyReceived || 0) - Number(entry.qtyIssued || 0)
      if (entry.batchNo) latestBatch = entry.batchNo
      if (entry.expiryDate) latestExpiry = entry.expiryDate
      return {
        ...entry,
        balance: Math.max(0, currentBalance),
      }
    })

    return {
      recalculatedEntries,
      totalQuantity: Math.max(0, currentBalance),
      totalReceived,
      totalIssued,
      latestBatch,
      latestExpiry,
    }
  }

  public async addBinCardEntry(productId: string, entry: Omit<BinCardMovementEntry, "id" | "balance">) {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) throw new Error("Product not found")

    const newEntry: BinCardMovementEntry = {
      ...entry,
      id: `BCE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      balance: 0,
    }

    const currentEntries = prod.binCardEntries || []
    const updatedEntries = [...currentEntries, newEntry]

    const { recalculatedEntries, totalQuantity, latestBatch, latestExpiry } = this.recalculateBinCardLedger(updatedEntries)
    const unitPrice = entry.unitPrice !== undefined ? Number(entry.unitPrice) : Number(prod.unitCost || 0)
    const nextVal = totalQuantity * (unitPrice || Number(prod.unitCost || 0))

    const updatedBreakdown = [{ warehouse: prod.warehouse, qty: totalQuantity }]
    const updatedBatches = recalculatedEntries.filter(e => e.batchNo).map(e => ({
      batchNo: e.batchNo,
      qty: e.qtyReceived,
      expiry: e.expiryDate || "",
      status: "Released" as const,
    }))

    return await this.updateProductDetails(productId, {
      quantity: totalQuantity,
      totalQuantity: totalQuantity + (prod.quantitySold || 0),
      totalStockValue: nextVal,
      batch: latestBatch || prod.batch,
      expiry: latestExpiry || prod.expiry,
      stockBreakdown: updatedBreakdown,
      batches: updatedBatches.length ? updatedBatches : prod.batches,
      binCardEntries: recalculatedEntries,
    })
  }

  public async updateBinCardEntry(productId: string, entryId: string, patch: Partial<BinCardMovementEntry>) {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) throw new Error("Product not found")

    const currentEntries = prod.binCardEntries || []
    const rawUpdated = currentEntries.map((e) => {
      if (e.id !== entryId) return e
      return { ...e, ...patch }
    })

    const { recalculatedEntries, totalQuantity, latestBatch, latestExpiry } = this.recalculateBinCardLedger(rawUpdated)
    const nextVal = totalQuantity * Number(prod.unitCost || 0)

    const updatedBreakdown = [{ warehouse: prod.warehouse, qty: totalQuantity }]
    const updatedBatches = recalculatedEntries.filter(e => e.batchNo).map(e => ({
      batchNo: e.batchNo,
      qty: e.qtyReceived,
      expiry: e.expiryDate || "",
      status: "Released" as const,
    }))

    return await this.updateProductDetails(productId, {
      quantity: totalQuantity,
      totalQuantity: totalQuantity + (prod.quantitySold || 0),
      totalStockValue: nextVal,
      batch: latestBatch || prod.batch,
      expiry: latestExpiry || prod.expiry,
      stockBreakdown: updatedBreakdown,
      batches: updatedBatches.length ? updatedBatches : prod.batches,
      binCardEntries: recalculatedEntries,
    })
  }

  public async deleteBinCardEntry(productId: string, entryId: string) {
    const prod = this.products.find((p) => p.id === productId)
    if (!prod) throw new Error("Product not found")

    const currentEntries = prod.binCardEntries || []
    const rawUpdated = currentEntries.filter((e) => e.id !== entryId)

    const { recalculatedEntries, totalQuantity, latestBatch, latestExpiry } = this.recalculateBinCardLedger(rawUpdated)
    const nextVal = totalQuantity * Number(prod.unitCost || 0)

    const updatedBreakdown = [{ warehouse: prod.warehouse, qty: totalQuantity }]

    return await this.updateProductDetails(productId, {
      quantity: totalQuantity,
      totalQuantity: totalQuantity + (prod.quantitySold || 0),
      totalStockValue: nextVal,
      batch: latestBatch || prod.batch,
      expiry: latestExpiry || prod.expiry,
      stockBreakdown: updatedBreakdown,
      binCardEntries: recalculatedEntries,
    })
  }

  // Actions - Quotations
  public addQuotation(quotation: Quotation) {
    this.quotations.unshift(quotation)
    this.notify()
  }

  public updateQuotationStatus(id: string, status: Quotation["status"]) {
    this.quotations = this.quotations.map((q) => (q.id === id ? { ...q, status } : q))
    this.notify()
  }

  public convertQuotationToSalesOrder(quotationId: string): SalesOrder | null {
    const q = this.quotations.find((item) => item.id === quotationId)
    if (!q) return null

    q.status = "Ordered"

    const newSo: SalesOrder = {
      id: `SO-${Date.now().toString().slice(-4)}`,
      quotationId: q.id,
      customer: q.customer,
      customerId: q.customerId,
      customerGroup: q.customerGroup,
      warehouse: q.warehouse,
      warehouseName: q.warehouseName,
      date: new Date().toISOString().split("T")[0],
      amount: q.amount,
      currency: q.currency,
      stage: "Confirmed",
      desc: `Converted from Quotation ${q.id}: ${q.desc}`,
      initials: q.customer.slice(0, 2).toUpperCase(),
      label: q.customer,
      avatarBg: "bg-emerald-100 text-emerald-800",
      urgent: false,
      attachment: true,
      items: q.items,
      deliveredAmount: 0,
      billedAmount: 0,
      deliveryStatus: "Not Delivered",
      billingStatus: "Not Billed",
      paymentTerms: q.paymentTerms || "Net 30",
      salesPerson: q.salesPerson
    }

    this.salesOrders.unshift(newSo)
    this.notify()
    return newSo
  }

  // Actions - Sales Orders
  public addSalesOrder(so: SalesOrder) {
    const enrichedSo: SalesOrder = {
      ...so,
      deliveredAmount: so.deliveredAmount || (so.stage === "Shipped" || so.stage === "Delivered" ? so.amount : 0),
      billedAmount: so.billedAmount || so.amount,
      deliveryStatus: so.deliveryStatus || (so.stage === "Shipped" || so.stage === "Delivered" ? "Fully Delivered" : "Not Delivered"),
      billingStatus: "Fully Billed",
    }
    this.salesOrders.unshift(enrichedSo)

    // Auto-create Customer AR Invoice & Double-Entry GL Entry in Finance Store
    try {
      const invId = `INV-2026-${Date.now().toString().slice(-4)}`
      const taxAmt = Math.round(so.amount * 0.15)
      const totalAmt = Math.round(so.amount * 1.15)

      financeStore.createInvoice({
        invoice_number: invId,
        customer_name: so.customer,
        issue_date: so.date || new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        currency: "ETB",
        line_items: (so.items || []).map((i) => ({
          description: i.name || "Sales Order Item",
          quantity: i.qty || 1,
          unit_price: i.unitPrice || 150,
          line_total: i.total || 150,
        })),
        subtotal: so.amount,
        tax_amount: taxAmt,
        discount_amount: 0,
        payment_terms: "Net 30",
        total: totalAmt,
        status: "Sent",
      })
    } catch (err) {
      console.error("Auto-posting Sales Order to Finance failed:", err)
    }

    this.notify()
  }

  public updateSalesOrder(updatedSo: SalesOrder) {
    this.salesOrders = this.salesOrders.map((so) => (so.id === updatedSo.id ? updatedSo : so))
    financeStore.updateInvoiceFromSalesOrder(updatedSo)
    this.saveToApi().catch((err) => console.error("Failed to persist updated Sales Order:", err))
    this.notify()
  }

  public updateSalesOrderStage(id: string, stage: SalesOrder["stage"], progress?: number) {
    this.salesOrders = this.salesOrders.map((so) => {
      if (so.id !== id) return so
      const isDelivered = stage === "Shipped" || stage === "Delivered"
      return {
        ...so,
        stage,
        progress: progress !== undefined ? progress : so.progress,
        deliveryStatus: isDelivered ? "Fully Delivered" : so.deliveryStatus || "Not Delivered",
        deliveredAmount: isDelivered ? so.amount : so.deliveredAmount || 0,
      }
    })
    this.notify()
  }

  // Dispatch / Fulfillment: Creates Delivery Note, reduces Product Inventory, and posts COGS GL Journal Entry
  public createDeliveryNoteForSalesOrder(
    soId: string,
    itemsToFulfill: Array<{ productId: string; qty: number }>,
    driverName?: string,
    vehicleReg?: string
  ): { success: boolean; error?: string; deliveryNote?: DeliveryNote } {
    const so = this.salesOrders.find((s) => s.id === soId)
    if (!so) return { success: false, error: "Sales Order not found." }

    let totalValue = 0
    let totalCogs = 0
    const dnItems: DeliveryNoteItem[] = []

    for (const item of itemsToFulfill) {
      const prod = this.products.find((p) => p.id === item.productId)
      const soLine = so.items.find((i) => i.productId === item.productId)
      const unitPrice = soLine ? soLine.unitPrice : prod ? prod.sellingPrice : 0
      const unitCost = prod ? prod.unitCost : unitPrice * 0.75

      const lineVal = item.qty * unitPrice
      const lineCogs = item.qty * unitCost

      totalValue += lineVal
      totalCogs += lineCogs

      dnItems.push({
        productId: item.productId,
        name: soLine ? soLine.name : prod ? prod.name : "Item",
        qty: item.qty,
        unit: soLine ? soLine.unit : prod ? prod.unit : "units",
        unitCost,
        unitPrice,
        totalValue: lineVal,
      })

      // Deduct Physical Stock from Inventory
      if (prod) {
        const newQty = Math.max(0, prod.quantity - item.qty)
        const updatedBreakdown = (prod.stockBreakdown || []).map((sb) =>
          sb.warehouse === so.warehouse ? { ...sb, qty: Math.max(0, sb.qty - item.qty) } : sb
        )
        const updatedBatches = (prod.batches || []).map((b) => ({
          ...b,
          qty: Math.max(0, b.qty - item.qty),
        }))
        const packSize = Number(prod.quantityPerPack || 1)
        const newCartons = packSize > 0 ? Math.max(0, Math.floor(newQty / packSize)) : Math.max(0, (prod.numberOfCartons || 0) - item.qty)
        const updatedStatus = newQty === 0 ? "Out of Stock" : newQty < 20 ? "Low Stock" : "In Stock"

        this.updateProduct(prod.id, {
          quantity: newQty,
          quantitySold: (prod.quantitySold || 0) + item.qty,
          numberOfCartons: newCartons,
          stockBreakdown: updatedBreakdown,
          batches: updatedBatches,
          status: updatedStatus,
        })
      }
    }

    const dnId = `DN-${Date.now().toString().slice(-4)}`

    // Post Double-Entry Journal Entry in Finance (Debit COGS ACC-5000, Credit Stock ACC-1010)
    let jeId: string | undefined = undefined
    try {
      // Resolve accounts by code — fall back gracefully if not in COA yet
      const cogsAcc = financeStore.getAccounts().find((a) => a.code === "5001" || a.code === "5000" || a.id === "ACC-5001" || a.account_type === "Expense")
      const stockAcc = financeStore.getAccounts().find((a) => a.code === "1410" || a.code === "1010" || a.id === "ACC-1410" || a.account_type === "Asset")

      if (cogsAcc && stockAcc && totalCogs > 0) {
        const postRes = financeStore.postJournalEntry(
          {
            entry_date: new Date().toISOString().split("T")[0],
            description: `Stock Fulfillment & COGS Recognition for Delivery Note ${dnId} (SO: ${so.id}, Client: ${so.customer})`,
            source_type: "Warehouse Transfer",
            source_id: dnId,
            created_by: "Sales & Inventory Dispatch System",
            currency: so.currency || "ETB",
            exchange_rate: 1.0,
          },
          [
            {
              account_id: cogsAcc.id,
              debit_amount: totalCogs,
              credit_amount: 0,
              warehouse_id: so.warehouse,
              party_type: "Customer",
              party_id: so.customerId,
              party_name: so.customer,
            },
            {
              account_id: stockAcc.id,
              debit_amount: 0,
              credit_amount: totalCogs,
              warehouse_id: so.warehouse,
            },
          ]
        )
        if (postRes.success && postRes.entry) {
          jeId = postRes.entry.id
        }
      }
    } catch {
      // GL posting failure must not block the delivery note from being created
    }

    const newDn: DeliveryNote = {
      id: dnId,
      salesOrderId: so.id,
      customer: so.customer,
      customerId: so.customerId,
      warehouse: so.warehouse,
      warehouseName: so.warehouseName,
      postingDate: new Date().toISOString().split("T")[0],
      driverName: driverName || "HKC Dispatch Logistics",
      vehicleReg: vehicleReg || "ET-LOG-01",
      status: "Submitted",
      items: dnItems,
      totalValue,
      cogsTotal: totalCogs,
      journalEntryId: jeId,
    }

    this.deliveryNotes.unshift(newDn)

    // Update Sales Order delivery state
    const currentDelivered = (so.deliveredAmount || 0) + totalValue
    const isFullyDelivered = currentDelivered >= so.amount
    const delStatus = isFullyDelivered ? "Fully Delivered" : "Partially Delivered"

    this.salesOrders = this.salesOrders.map((s) => {
      if (s.id !== soId) return s
      const dnList = s.deliveryNoteIds || []
      return {
        ...s,
        deliveredAmount: currentDelivered,
        deliveryStatus: delStatus,
        stage: isFullyDelivered ? "Shipped" : s.stage,
        deliveryNoteIds: [...dnList, dnId],
      }
    })

    this.notify()
    return { success: true, deliveryNote: newDn }
  }

  // Create Sales Invoice in Finance Store from Sales Order
  public createSalesInvoiceForSalesOrder(
    soId: string,
    taxPercent = 15,
    paymentTerms = "Net 30"
  ): { success: boolean; error?: string; invoiceId?: string } {
    const so = this.salesOrders.find((s) => s.id === soId)
    if (!so) return { success: false, error: "Sales Order not found." }

    if (so.billingStatus === "Fully Billed" || (so.invoiceIds && so.invoiceIds.length > 0)) {
      return { success: false, error: "An invoice has already been generated for this Sales Order." }
    }

    const subtotal = so.amount
    const taxAmount = Math.round((subtotal * (taxPercent / 100)) * 100) / 100
    const total = subtotal + taxAmount

    const lineItems = so.items.map((i) => ({
      description: `${i.name} (${i.qty} ${i.unit})`,
      quantity: i.qty,
      unit_price: i.unitPrice,
      line_total: i.total,
    }))

    const issueDate = new Date().toISOString().split("T")[0]
    const dueDateObj = new Date()
    dueDateObj.setDate(dueDateObj.getDate() + 30)
    const dueDate = dueDateObj.toISOString().split("T")[0]
    const invNum = `INV-${Date.now().toString().slice(-5)}`

    const newInv = financeStore.createInvoice({
      invoice_number: invNum,
      sales_order_id: so.id,
      customer_name: so.customer,
      issue_date: issueDate,
      due_date: dueDate,
      currency: so.currency || "ETB",
      line_items: lineItems,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: 0,
      payment_terms: paymentTerms,
      total,
      status: "Sent",
    })

    const invId = newInv.id

    // Update Sales Order billing status
    const currentBilled = (so.billedAmount || 0) + total
    const isFullyBilled = currentBilled >= total
    const billStatus = isFullyBilled ? "Fully Billed" : "Partially Billed"

    this.salesOrders = this.salesOrders.map((s) => {
      if (s.id !== soId) return s
      const invList = s.invoiceIds || []
      return {
        ...s,
        billedAmount: currentBilled,
        billingStatus: billStatus,
        invoiceIds: [...invList, invId],
      }
    })

    this.notify()
    return { success: true, invoiceId: invId }
  }

  public deleteSalesOrder(id: string) {
    this.salesOrders = this.salesOrders.filter((so) => so.id !== id)
    deleteResource("sales_orders", id).catch((err) => console.error("Failed to delete Sales Order:", err))
    this.notify()
  }

  // Customer Credit Limit Analysis
  public getCustomerCreditUsage(customerId: string): { limit: number; used: number; available: number; isOverLimit: boolean } {
    const cust = this.customers.find((c) => c.id === customerId)
    const limit = (cust?.creditLimit !== undefined && cust?.creditLimit !== null) ? cust.creditLimit : 500000

    // Sum open Sales Orders amount + outstanding AR invoices in financeStore
    const openOrdersAmount = this.salesOrders
      .filter((so) => so.customerId === customerId && so.stage !== "Delivered" && so.stage !== "Cancelled")
      .reduce((sum, so) => sum + so.amount, 0)

    const invoices = financeStore.getInvoices().filter((inv) => inv.customer_name === (cust?.name || ""))
    const outstandingInvoicesAmount = invoices.reduce((sum, inv) => sum + inv.balance_due, 0)

    const used = openOrdersAmount + outstandingInvoicesAmount
    const available = Math.max(0, limit - used)

    return {
      limit,
      used,
      available,
      isOverLimit: used > limit,
    }
  }

  // --- Actions: Customers ---
  public addCustomer(customer: Customer) {
    const existing = this.customers.find((c) => c.id === customer.id || (c.name && c.name.toLowerCase() === customer.name.toLowerCase()))
    if (existing) {
      this.updateCustomer(existing.id, customer)
      return existing
    }
    this.customers.unshift(customer)
    createResource("customers", customer).catch((err) => console.error("Failed to persist new Customer:", err))
    this.notify()
    return customer
  }

  public updateCustomer(id: string, updates: Partial<Customer>) {
    this.customers = this.customers.map((c) => (c.id === id ? { ...c, ...updates } : c))
    updateResource("customers", id, updates).catch((err) => console.error("Failed to update Customer:", err))
    this.notify()
  }

  public deleteCustomer(id: string) {
    this.customers = this.customers.filter((c) => c.id !== id)
    deleteResource("customers", id).catch((err) => console.error("Failed to delete Customer:", err))
    this.notify()
  }

  // --- Actions: Suppliers ---
  public addSupplier(supplier: Supplier) {
    const existing = this.suppliers.find((s) => s.id === supplier.id || (s.name && s.name.toLowerCase() === supplier.name.toLowerCase()))
    if (existing) {
      this.updateSupplier(existing.id, supplier)
      return existing
    }
    this.suppliers.unshift(supplier)
    createResource("suppliers", supplier).catch((err) => console.error("Failed to persist new Supplier:", err))
    this.notify()
    return supplier
  }

  public updateSupplier(id: string, updates: Partial<Supplier>) {
    this.suppliers = this.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s))
    updateResource("suppliers", id, updates).catch((err) => console.error("Failed to update Supplier:", err))
    this.notify()
  }

  public deleteSupplier(id: string) {
    this.suppliers = this.suppliers.filter((s) => s.id !== id)
    deleteResource("suppliers", id).catch((err) => console.error("Failed to delete Supplier:", err))
    this.notify()
  }

  // Actions - Purchase Orders
  public addPurchaseOrder(po: PurchaseOrder) {
    this.purchaseOrders.unshift(po)
    this.notify()
  }

  public updatePurchaseOrderStatus(id: string, status: PurchaseOrder["status"]) {
    const statusColorMap = {
      DRAFT: "bg-zinc-600 text-white",
      "IN TRANSIT": "bg-blue-700 text-white",
      RECEIVED: "bg-emerald-600 text-white",
      CANCELLED: "bg-red-600 text-white",
    }
    this.purchaseOrders = this.purchaseOrders.map((po) =>
      po.id === id ? { ...po, status, statusColor: statusColorMap[status] || "bg-zinc-600 text-white" } : po
    )
    this.notify()
  }

  // Receive Stock Goods for Purchase Order (Stock Goods Receipt & Inventory GL Voucher)
  public createPurchaseReceiptForPO(
    poId: string,
    receivedItems?: Array<{ productId: string; qty: number }>
  ): { success: boolean; error?: string; journalEntryId?: string } {
    const po = this.purchaseOrders.find((p) => p.id === poId)
    if (!po) return { success: false, error: "Purchase Order not found." }

    // 1. Update product quantities in inventory store
    po.items.forEach((item) => {
      const recQty = receivedItems?.find((i) => i.productId === item.productId)?.qty ?? item.qty
      const pIndex = this.products.findIndex((prod) => prod.id === item.productId || prod.sku === item.sku)
      if (pIndex !== -1) {
        this.products[pIndex] = {
          ...this.products[pIndex],
          quantity: this.products[pIndex].quantity + recQty,
          status: "In Stock",
        }
      }
    })

    // 2. Post Goods Received Double-Entry Journal Entry in Finance Store
    // Debit 1410 Inventory / Stock In Hand
    // Credit 2120 Stock Received But Not Billed (clearing account) or 2100 Accounts Payable
    const invAcc =
      financeStore.getAccounts().find((a) => a.code === "1410" || a.code === "1300" || a.name?.toLowerCase().includes("inventory") || a.name?.toLowerCase().includes("stock in hand")) ||
      financeStore.getAccounts().find((a) => a.account_type === "Asset")
    const clearingAcc =
      financeStore.getAccounts().find((a) => a.code === "2120") ||
      financeStore.getAccounts().find((a) => a.code === "2100" || a.name?.toLowerCase().includes("payable")) ||
      financeStore.getAccounts().find((a) => a.account_type === "Liability")

    let jeId: string | undefined
    if (invAcc && clearingAcc) {
      const postRes = financeStore.postJournalEntry(
        {
          entry_date: new Date().toISOString().split("T")[0],
          description: `Stock Goods Receipt for PO ${po.poNumber} (${po.supplier})`,
          source_type: "Purchase Invoice",
          source_id: po.id,
          created_by: "Warehouse Procurement Officer",
          currency: po.currency || "ETB",
          exchange_rate: 1.0,
        },
        [
          { account_id: invAcc.id, debit_amount: po.amount, credit_amount: 0, warehouse_id: po.warehouse },
          {
            account_id: clearingAcc.id,
            debit_amount: 0,
            credit_amount: po.amount,
            party_type: "Supplier" as const,
            party_id: po.supplierId,
            party_name: po.supplier,
          },
        ]
      )
      if (postRes.success && postRes.entry) {
        jeId = postRes.entry.id
      }
    }

    // 3. Update PO status
    const receiptId = `PR-${Date.now().toString().slice(-5)}`
    this.purchaseOrders = this.purchaseOrders.map((p) => {
      if (p.id !== poId) return p
      const existingReceipts = p.receiptIds || []
      return {
        ...p,
        status: "RECEIVED" as const,
        statusColor: "bg-emerald-600 text-white",
        receiptStatus: "Fully Received" as const,
        receivedAmount: p.amount,
        receiptIds: [...existingReceipts, receiptId],
      }
    })

    this.notify()
    return { success: true, journalEntryId: jeId }
  }

  // Create Supplier Purchase Invoice (Accounts Payable / AP Ledger in Finance)
  public createPurchaseInvoiceForPO(
    poId: string,
    taxPercent = 15,
    paymentTerms = "Net 30"
  ): { success: boolean; error?: string; invoiceId?: string; journalEntryId?: string } {
    const po = this.purchaseOrders.find((p) => p.id === poId)
    if (!po) return { success: false, error: "Purchase Order not found." }

    const taxAmount = Math.round((po.amount * (taxPercent / 100)) * 100) / 100
    const totalAmount = po.amount + taxAmount

    // Post AP Journal Entry:
    // Debit 2120 Stock Received Not Billed (clearing) → clears the goods receipt entry
    // Credit 2100 Accounts Payable (with supplier party reference for AP aging)
    const clearingAcc =
      financeStore.getAccounts().find((a) => a.code === "2120") ||
      financeStore.getAccounts().find((a) => a.code === "5100" || a.account_type === "Expense") ||
      financeStore.getAccounts().find((a) => a.account_type === "Asset")
    const apAcc =
      financeStore.getAccounts().find((a) => a.code === "2100") ||
      financeStore.getAccounts().find((a) => a.account_type === "Liability")

    let jeId: string | undefined
    if (clearingAcc && apAcc) {
      const postRes = financeStore.postJournalEntry(
        {
          entry_date: new Date().toISOString().split("T")[0],
          description: `Accounts Payable Vendor Invoice for PO ${po.poNumber} - ${po.supplier} (${paymentTerms})`,
          source_type: "Purchase Invoice",
          source_id: po.id,
          created_by: "Accounts Payable Manager",
          currency: po.currency || "ETB",
          exchange_rate: 1.0,
        },
        [
          { account_id: clearingAcc.id, debit_amount: po.amount, credit_amount: 0 },
          {
            account_id: apAcc.id,
            debit_amount: 0,
            credit_amount: totalAmount,
            party_type: "Supplier" as const,
            party_id: po.supplierId,
            party_name: po.supplier,
          },
        ]
      )
      if (postRes.success && postRes.entry) {
        jeId = postRes.entry.id
      }
    }

    const pinvId = `PINV-${Date.now().toString().slice(-5)}`

    // Update PO billing status
    this.purchaseOrders = this.purchaseOrders.map((p) => {
      if (p.id !== poId) return p
      const existingInvoices = p.invoiceIds || []
      return {
        ...p,
        billedAmount: totalAmount,
        billingStatus: "Fully Billed" as const,
        invoiceIds: [...existingInvoices, pinvId],
      }
    })

    this.notify()
    return { success: true, invoiceId: pinvId, journalEntryId: jeId }
  }

  public evaluateStock() {
    return evaluateStockStatus(this.products, this.stockMovements)
  }

  public validateTransfer(transfer: any) {
    return validateTransferNote(transfer)
  }

  public processPipeline(so: any, stage: string) {
    return processSalesOrderPipeline(so, stage)
  }

  public getCompanySettings() {
    return financeStore.getCompanySettings()
  }

  public updateCompanySettings(partial: any) {
    financeStore.updateCompanySettings(partial)
    this.notify()
  }

  public clearAllTestingData() {
    this.products = []
    this.salesOrders = []
    this.purchaseOrders = []
    this.quotations = []
    this.deliveryNotes = []
    this.transfers = []
    this.stockMovements = []
    this.notify()
    financeStore.clearAllTestingData()
  }
}

export const erpStore = new ErpStore()

export function useErpStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = erpStore.subscribe(() => setTick((t) => t + 1))
    return () => { unsub() }
  }, [])

  return erpStore
}

export interface HkcDocAttachment {
  attachmentId: string
  fileName: string
  fileUrl: string
  fileSize?: number
  uploadedAt: string
}

export interface HkcDocRecord {
  id: string
  shipmentId: string
  itemsDescription: string
  type: "Import" | "Export"
  date: string
  attachments: HkcDocAttachment[]
  createdAt: string
  updatedAt: string
}
