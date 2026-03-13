import { pgTable, serial, integer, numeric, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const advanceRequestsTable = pgTable("advance_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdvanceRequestSchema = createInsertSchema(advanceRequestsTable).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertAdvanceRequest = z.infer<typeof insertAdvanceRequestSchema>;
export type AdvanceRequest = typeof advanceRequestsTable.$inferSelect;
