import { pgTable, serial, integer, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  salaryType: varchar("salary_type", { length: 50 }).notNull().default("monthly"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  monthlySalary: numeric("monthly_salary", { precision: 10, scale: 2 }),
  qrCode: text("qr_code"),
  telegramId: varchar("telegram_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, qrCode: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
