import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  adminId: integer("admin_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: integer("entity_id"),
  detail: text("detail"),
  ip: varchar("ip", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
