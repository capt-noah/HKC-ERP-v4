import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const warehouses = pgTable("warehouses", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const inventoryProducts = pgTable("inventory_products", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const storeTransfers = pgTable("store_transfers", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Drizzle Relations
export const warehousesRelations = relations(warehouses, ({ many }) => ({
  products: many(inventoryProducts),
  stockMovements: many(stockMovements),
  storeTransfers: many(storeTransfers),
}))

export const inventoryProductsRelations = relations(inventoryProducts, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [inventoryProducts.id],
    references: [warehouses.id],
  }),
  stockMovements: many(stockMovements),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(inventoryProducts, {
    fields: [stockMovements.id],
    references: [inventoryProducts.id],
  }),
}))

export type Warehouse = typeof warehouses.$inferSelect
export type NewWarehouse = typeof warehouses.$inferInsert
export type InventoryProduct = typeof inventoryProducts.$inferSelect
export type NewInventoryProduct = typeof inventoryProducts.$inferInsert
export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert
export type StoreTransfer = typeof storeTransfers.$inferSelect
export type NewStoreTransfer = typeof storeTransfers.$inferInsert
