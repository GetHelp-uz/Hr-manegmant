import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const payrollTable = pgTable("payroll", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalHours: numeric("total_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  totalDays: integer("total_days").notNull().default(0),
  grossSalary: numeric("gross_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayrollSchema = createInsertSchema(payrollTable).omit({ id: true, createdAt: true });
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Payroll = typeof payrollTable.$inferSelect;
