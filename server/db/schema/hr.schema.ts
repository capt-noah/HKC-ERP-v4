import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const attendanceRecords = pgTable("attendance_records", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const payrollPeriods = pgTable("payroll_periods", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const payrollRecords = pgTable("payroll_records", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const leaveTypes = pgTable("leave_types", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Drizzle Relations
export const employeesRelations = relations(employees, ({ many }) => ({
  attendance: many(attendanceRecords),
  payrollRecords: many(payrollRecords),
  leaveRequests: many(leaveRequests),
}))

export const payrollPeriodsRelations = relations(payrollPeriods, ({ many }) => ({
  records: many(payrollRecords),
}))

export const leaveTypesRelations = relations(leaveTypes, ({ many }) => ({
  requests: many(leaveRequests),
}))

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert
export type AttendanceRecord = typeof attendanceRecords.$inferSelect
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert
export type PayrollPeriod = typeof payrollPeriods.$inferSelect
export type NewPayrollPeriod = typeof payrollPeriods.$inferInsert
export type PayrollRecord = typeof payrollRecords.$inferSelect
export type NewPayrollRecord = typeof payrollRecords.$inferInsert
export type LeaveType = typeof leaveTypes.$inferSelect
export type NewLeaveType = typeof leaveTypes.$inferInsert
export type LeaveRequest = typeof leaveRequests.$inferSelect
export type NewLeaveRequest = typeof leaveRequests.$inferInsert
