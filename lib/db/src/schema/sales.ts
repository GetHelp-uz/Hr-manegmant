import { pgTable, serial, integer, numeric, timestamp, varchar, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { branchesTable } from "./branches";
import { employeesTable } from "./employees";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  branchId: integer("branch_id").references(() => branchesTable.id),
  employeeId: integer("employee_id").references(() => employeesTable.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  itemsCount: integer("items_count").default(0),
  source: varchar("source", { length: 50 }).default("manual"),
  externalRef: varchar("external_ref", { length: 100 }),
  notes: text("notes"),
  saleTime: timestamp("sale_time").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
