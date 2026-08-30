import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const companySettings = pgTable("company_settings", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const recurringExpenseSchedules = pgTable("recurring_expense_schedules", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const taxRules = pgTable("tax_rules", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Drizzle Relations
export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalEntryLines),
}))

export const invoicesRelations = relations(invoices, ({ many }) => ({
  payments: many(payments),
}))
