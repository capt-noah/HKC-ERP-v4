import { pgTable, text, numeric, timestamp, jsonb, date } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Document Tables
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const salesOrders = pgTable("sales_orders", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const hkcDocRecords = pgTable("hkc_doc_records", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Relational Tables
export const salesIssues = pgTable("sales_issues", {
  id: text("id").primaryKey(),
  salesOrderId: text("sales_order_id"),
  issueNumber: text("issue_number").notNull(),
  customerId: text("customer_id"),
  issueDate: date("issue_date").defaultNow().notNull(),
  status: text("status").default("Draft").notNull(),
  totalAmount: numeric("total_amount").default("0").notNull(),
  subtotalAmount: numeric("subtotal_amount").default("0").notNull(),
  taxAmount: numeric("tax_amount").default("0").notNull(),
  paymentStatus: text("payment_status").default("Unpaid").notNull(),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const salesIssueItems = pgTable("sales_issue_items", {
  id: text("id").primaryKey(),
  salesIssueId: text("sales_issue_id")
    .notNull()
    .references(() => salesIssues.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  quantity: numeric("quantity").default("1").notNull(),
  unitPrice: numeric("unit_price").default("0").notNull(),
  totalPrice: numeric("total_price").default("0").notNull(),
  batchNumber: text("batch_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const processingServices = pgTable("processing_services", {
  id: text("id").primaryKey(),
  referenceNumber: text("reference_number"),
  clientCompanyName: text("client_company_name"),
  customerId: text("customer_id"),
  goodsDescription: text("goods_description"),
  quantity: numeric("quantity").default("1"),
  uom: text("uom").default("Quintal"),
  entryDate: text("entry_date"),
  agreedPrice: numeric("agreed_price").default("0"),
  currency: text("currency").default("ETB"),
  status: text("status").default("Received"),
  statusHistory: jsonb("status_history").default([]),
  assignedTo: text("assigned_to"),
  invoiceId: text("invoice_id"),
  notes: text("notes"),
  contractUrl: text("contract_url"),
  contractFileName: text("contract_file_name"),
  lockedProcessingRate: numeric("locked_processing_rate"),
  lockedProcessingFee: numeric("locked_processing_fee"),
  lockedStorageFee: numeric("locked_storage_fee"),
  lockedTotalFee: numeric("locked_total_fee"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const shipmentDocuments = pgTable("shipment_documents", {
  id: text("id").primaryKey(),
  recordId: text("record_id").notNull(),
  recordType: text("record_type").default("purchase_order").notNull(),
  documentType: text("document_type").default("Other").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: numeric("file_size").default("1024"),
  fileUrl: text("file_url"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  uploadedBy: text("uploaded_by").default("Current User"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Drizzle Relations
export const salesIssuesRelations = relations(salesIssues, ({ many }) => ({
  items: many(salesIssueItems),
}))

export const salesIssueItemsRelations = relations(salesIssueItems, ({ one }) => ({
  salesIssue: one(salesIssues, {
    fields: [salesIssueItems.salesIssueId],
    references: [salesIssues.id],
  }),
}))

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert
export type SalesOrder = typeof salesOrders.$inferSelect
export type NewSalesOrder = typeof salesOrders.$inferInsert
export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert
export type SalesIssue = typeof salesIssues.$inferSelect
export type NewSalesIssue = typeof salesIssues.$inferInsert
export type SalesIssueItem = typeof salesIssueItems.$inferSelect
export type NewSalesIssueItem = typeof salesIssueItems.$inferInsert
export type ProcessingService = typeof processingServices.$inferSelect
export type NewProcessingService = typeof processingServices.$inferInsert
export type ShipmentDocument = typeof shipmentDocuments.$inferSelect
export type NewShipmentDocument = typeof shipmentDocuments.$inferInsert
export type HkcDocRecord = typeof hkcDocRecords.$inferSelect
export type NewHkcDocRecord = typeof hkcDocRecords.$inferInsert
