import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const activationCodes = sqliteTable("activation_codes", {
  code: text("code").primaryKey(),
  status: text("status", { enum: ["ACTIVE", "USED", "REVOKED"] })
    .notNull()
    .default("ACTIVE"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at")
})

export type ActivationCode = typeof activationCodes.$inferSelect
