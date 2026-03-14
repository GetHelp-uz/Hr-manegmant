import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Tashkent"),
  managerId: integer("manager_id"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
