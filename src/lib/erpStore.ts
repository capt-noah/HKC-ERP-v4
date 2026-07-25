import { useState, useEffect } from "react"
import warehousesData from "../../data/warehouses.json"
import inventoryProductsData from "../../data/inventory_products.json"
import salesOrdersData from "../../data/sales_orders.json"
import purchaseOrdersData from "../../data/purchase_orders.json"
import customersData from "../../data/customers.json"
import suppliersData from "../../data/suppliers.json"
import { loadResource, persistResources } from "./apiPersistence"
import { financeStore } from "./financeStore"

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

export interface Product {
  id: string
  name: string
  sku: string
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
  shelfLifeMonths?: number
  expiryAlertEnabled?: boolean
  expiryAlertPeriod?: string
  status: "In Stock" | "Low Stock" | "Quarantined" | "Out of Stock" | "Pending QA"
  stockBreakdown: StockBreakdown[]
  batches: BatchInfo[]
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
  region: string
  contactPerson: string
  email: string
  category: string
  warehouseTarget: string
  creditLimit: number
  status: string
}

export interface Supplier {
  id: string
  name: string
  country: string
  city: string
  category: string
  warehouseTarget: string
  contactPerson: string
  email: string
  rating: string
  status: string
}

const initialQuotations: Quotation[] = [
  {
    id: "QT-2026-001",
    customer: "Tokyo Specialty Commodities Corp",
    customerId: "CUST-002",
    customerGroup: "International Buyer (Export)",
    warehouse: "WH1",
    warehouseName: "WH1 - Agricultural Export Hub",
    date: "2026-07-20",
    validTill: "2026-08-20",
    amount: 520000,
    currency: "ETB",
    status: "Quoted",
    desc: "Export Quote: 10 Metric Tons Humera White Sesame Seeds (Grade A)",
    paymentTerms: "Net 30",
    salesPerson: "Kenji Sato",
    items: [
      { productId: "P-102", name: "Humera White Sesame Seeds", qty: 10, unit: "Metric Tons", unitPrice: 52000, total: 520000 }
    ]
  },
  {
    id: "QT-2026-002",
    customer: "Oromia Livestock Development Bureau",
    customerId: "CUST-007",
    customerGroup: "Government Agency / Bureau",
    warehouse: "WH2",
    warehouseName: "WH2 - Veterinary Import Hub (India)",
    date: "2026-07-22",
    validTill: "2026-08-22",
    amount: 320000,
    currency: "ETB",
    status: "Draft",
    desc: "Government Tender Quote: Oxytetracycline & Multi-Vitamin Soluble Powder",
    paymentTerms: "Payment on Delivery",
    salesPerson: "Dr. Worku Alemayehu",
    items: [
      { productId: "P-201", name: "Oxytetracycline 20% LA Injectable (100ml)", qty: 500, unit: "vials (100ml)", unitPrice: 480, total: 240000 },
      { productId: "P-202", name: "Multivitamin Fortified Veterinary Injectable", qty: 200, unit: "vials (100ml)", unitPrice: 400, total: 80000 }
    ]
  }
]

const initialDeliveryNotes: DeliveryNote[] = [
  {
    id: "DN-2026-001",
    salesOrderId: "SO-1101",
    customer: "Hamburg Coffee Importers GmbH",
    customerId: "CUST-001",
    warehouse: "WH1",
    warehouseName: "WH1 - Agricultural Export Hub",
    postingDate: "2026-07-18",
    driverName: "Abebe Bikila",
    vehicleReg: "ET-3-8821",
    status: "Submitted",
    items: [
      { productId: "P-101", name: "Grade 1 Yirgacheffe Arabica Coffee Beans", qty: 50, unit: "bags (60kg)", unitCost: 11000, unitPrice: 14200, totalValue: 710000 }
    ],
    totalValue: 710000,
    cogsTotal: 550000,
    journalEntryId: "JE-2026-090"
  }
]

const initialTransfers: Transfer[] = [
  {
    reference_number: "TR-0001",
    from_warehouse: "WH1",
    to_warehouse: "WH2",
    status: "Received",
    date: "2026-07-15",
    line_items: [
      { line_no: 1, item: "Oxytetracycline 20% LA Injectable (100ml)", UOM: "vials", quantity: 50, remark: "Urgent restocking for batch QA" }
    ],
    total_quantity: 50,
    issued_by: "Noah",
    issued_at: "2026-07-15 09:30",
    issued_signature: "Noah T.",
    received_by: "Sophia",
    received_at: "2026-07-15 14:45",
    received_signature: "Sophia R."
  },
  {
    reference_number: "TR-0002",
    from_warehouse: "WH2",
    to_warehouse: "WH3",
    status: "Issued",
    date: "2026-07-19",
    line_items: [
      { line_no: 1, item: "Amoxicillin Trihydrate 50% Soluble Powder", UOM: "tins (1kg)", quantity: 20, remark: "Standard replenishment" }
    ],
    total_quantity: 20,
    issued_by: "Sophia",
    issued_at: "2026-07-19 11:15",
    issued_signature: "Sophia R."
  }
]

const initialStockMovements: StockMovementLog[] = [
  {
    id: "SM-101",
    date: "2026-07-15",
    type: "TRANSFER",
    productName: "Oxytetracycline 20% LA Injectable (100ml)",
    fromWarehouse: "WH1",
    toWarehouse: "WH2",
    qty: 50,
    unit: "vials",
    reference: "TR-0001",
    remarks: "Inter-warehouse Transfer Completed"
  },
  {
    id: "SM-102",
    date: "2026-07-18",
    type: "FULFILLMENT",
    productName: "Grade 1 Yirgacheffe Arabica Coffee Beans",
    fromWarehouse: "WH1",
    qty: 50,
    unit: "bags (60kg)",
    reference: "DN-2026-001",
    journalEntryId: "JE-2026-090",
    remarks: "Sales Dispatch to Hamburg Coffee Importers"
  }
]

class ErpStore {
  private warehouses: Warehouse[] = warehousesData as Warehouse[]
  private products: Product[] = (inventoryProductsData as any[]).map((p) => ({
    ...p,
    reorderLevel: p.reorderLevel || 100,
    valuationRate: p.unitCost || 1000
  })) as Product[]
  private salesOrders: SalesOrder[] = salesOrdersData as SalesOrder[]
  private purchaseOrders: PurchaseOrder[] = purchaseOrdersData as PurchaseOrder[]
  private customers: Customer[] = customersData as Customer[]
  private suppliers: Supplier[] = suppliersData as Supplier[]
  private quotations: Quotation[] = initialQuotations
  private deliveryNotes: DeliveryNote[] = initialDeliveryNotes
  private transfers: Transfer[] = initialTransfers
  private stockMovements: StockMovementLog[] = initialStockMovements

  private listeners = new Set<() => void>()

  constructor() {
    this.loadFromApi()
  }

  private async loadFromApi() {
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
        loadResource<Warehouse>("warehouses", this.warehouses),
        loadResource<Product>("inventory_products", this.products),
        loadResource<SalesOrder>("sales_orders", this.salesOrders),
        loadResource<PurchaseOrder>("purchase_orders", this.purchaseOrders),
        loadResource<Customer>("customers", this.customers),
        loadResource<Supplier>("suppliers", this.suppliers),
        loadResource<Quotation>("quotations", this.quotations),
        loadResource<DeliveryNote>("delivery_notes", this.deliveryNotes),
        loadResource<Transfer>("store_transfers", this.transfers.map((transfer) => ({ id: transfer.reference_number, ...transfer }))),
        loadResource<StockMovementLog>("stock_movements", this.stockMovements),
      ])

      this.warehouses = warehouses
      this.products = products
      this.salesOrders = salesOrders
      this.purchaseOrders = purchaseOrders
      this.customers = customers
      this.suppliers = suppliers
      this.quotations = quotations
      this.deliveryNotes = deliveryNotes
      this.transfers = transfers.map(({ id: _id, ...transfer }) => transfer as Transfer)
      this.stockMovements = stockMovements
      this.listeners.forEach((l) => l())
    } catch (error) {
      console.error("Failed to load ERP data from Supabase.", error)
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

  private notify() {
    void this.saveToApi().catch((error) => {
      console.error("Failed to persist ERP data to Supabase.", error)
    })
    this.listeners.forEach((l) => l())
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
    const previousProducts = this.products
    this.products.unshift(product)
    this.listeners.forEach((l) => l())
    try {
      await this.saveToApi()
    } catch (error) {
      this.products = previousProducts
      this.listeners.forEach((l) => l())
      throw error
    }
  }

  public updateProduct(id: string, partial: Partial<Product>) {
    this.products = this.products.map((p) => (p.id === id ? { ...p, ...partial } : p))
    this.notify()
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
      billedAmount: so.billedAmount || 0,
      deliveryStatus: so.deliveryStatus || (so.stage === "Shipped" || so.stage === "Delivered" ? "Fully Delivered" : "Not Delivered"),
      billingStatus: so.billingStatus || "Not Billed",
    }
    this.salesOrders.unshift(enrichedSo)
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
        const updatedBreakdown = prod.stockBreakdown.map((sb) =>
          sb.warehouse === so.warehouse ? { ...sb, qty: Math.max(0, sb.qty - item.qty) } : sb
        )
        const updatedStatus = newQty === 0 ? "Out of Stock" : newQty < 20 ? "Low Stock" : "In Stock"

        this.updateProduct(prod.id, {
          quantity: newQty,
          stockBreakdown: updatedBreakdown,
          status: updatedStatus,
        })
      }
    }

    const dnId = `DN-${Date.now().toString().slice(-4)}`

    // Post Double-Entry Journal Entry in Finance (Debit COGS ACC-5000, Credit Stock ACC-1010)
    let jeId: string | undefined = undefined
    try {
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
            account_id: "acc-5000", // Cost of Goods Sold
            debit_amount: totalCogs,
            credit_amount: 0,
            warehouse_id: so.warehouse,
            party_type: "Customer",
            party_id: so.customerId,
            party_name: so.customer,
          },
          {
            account_id: "acc-1010", // Raw Material / Merchandise Inventory
            debit_amount: 0,
            credit_amount: totalCogs,
            warehouse_id: so.warehouse,
            party_type: "Customer",
            party_id: so.customerId,
            party_name: so.customer,
          },
        ]
      )
      if (postRes.success && postRes.entry) {
        jeId = postRes.entry.id
      }
    } catch {
      // Ignore if GL posting fails gracefully
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

  // Customer Credit Limit Analysis
  public getCustomerCreditUsage(customerId: string): { limit: number; used: number; available: number; isOverLimit: boolean } {
    const cust = this.customers.find((c) => c.id === customerId)
    const limit = cust ? cust.creditLimit : 500000

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
    // Debit 1410 (Inventory / Stock In Hand)
    // Credit 2120 (Stock Received But Not Billed / Payable Clearing)
    const invAcc = financeStore.getAccounts().find((a) => a.code === "1410" || a.name.includes("Inventory")) || financeStore.getAccounts()[0]
    const clearingAcc = financeStore.getAccounts().find((a) => a.code === "2120" || a.code === "2100" || a.name.includes("Payable")) || financeStore.getAccounts()[1]

    let jeId = "JE-PURCH-RCV"
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
          { account_id: clearingAcc.id, debit_amount: 0, credit_amount: po.amount },
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
    // Debit 2120 Stock Received Not Billed / Cost of Sourcing Account
    // Credit 2100 Accounts Payable (Supplier Account)
    const clearingAcc = financeStore.getAccounts().find((a) => a.code === "2120" || a.code === "5100" || a.account_type === "Expense") || financeStore.getAccounts()[0]
    const apAcc = financeStore.getAccounts().find((a) => a.code === "2100" || a.account_type === "Liability") || financeStore.getAccounts()[1]

    let jeId = "JE-AP-INV"
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
          { account_id: apAcc.id, debit_amount: 0, credit_amount: totalAmount, party_type: "Supplier", party_id: po.supplierId, party_name: po.supplier },
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
}

export const erpStore = new ErpStore()

export function useErpStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = erpStore.subscribe(() => setTick((t) => t + 1))
    return () => {
      unsub()
    }
  }, [])

  return erpStore
}
