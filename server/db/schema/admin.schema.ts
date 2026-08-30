import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("viewer").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const userActivityLogs = pgTable("user_activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// Drizzle Relations
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(userActivityLogs),
}))

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserActivityLog = typeof userActivityLogs.$inferSelect
export type NewUserActivityLog = typeof userActivityLogs.$inferInsert
