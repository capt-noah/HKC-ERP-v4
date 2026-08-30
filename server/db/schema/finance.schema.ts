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

export type CompanySettings = typeof companySettings.$inferSelect
export type NewCompanySettings = typeof companySettings.$inferInsert
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert
export type JournalEntry = typeof journalEntries.$inferSelect
export type NewJournalEntry = typeof journalEntries.$inferInsert
export type JournalEntryLine = typeof journalEntryLines.$inferSelect
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
export type RecurringExpenseSchedule = typeof recurringExpenseSchedules.$inferSelect
export type NewRecurringExpenseSchedule = typeof recurringExpenseSchedules.$inferInsert
export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
export type TaxRule = typeof taxRules.$inferSelect
export type NewTaxRule = typeof taxRules.$inferInsert
