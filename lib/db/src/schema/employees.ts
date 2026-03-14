import { pgTable, serial, integer, varchar, text, numeric, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  departmentId: integer("department_id"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  salaryType: varchar("salary_type", { length: 50 }).notNull().default("monthly"),
  hourlyRate: numeric("hourly_rate", { precision: 15, scale: 2 }),
  monthlySalary: numeric("monthly_salary", { precision: 15, scale: 2 }),
  dailyRate: numeric("daily_rate", { precision: 15, scale: 2 }),
  pieceRate: numeric("piece_rate", { precision: 15, scale: 2 }),
  pieceRatePlan: integer("piece_rate_plan").default(0),
  bonusPercent: numeric("bonus_percent", { precision: 5, scale: 2 }).default("0"),
  employeeCode: varchar("employee_code", { length: 20 }),
  qrCode: text("qr_code"),
  faceDescriptor: text("face_descriptor"),
  telegramId: varchar("telegram_id", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  jshshir: varchar("jshshir", { length: 20 }),
  passportSeries: varchar("passport_series", { length: 20 }),
  birthDate: date("birth_date"),
  employmentType: varchar("employment_type", { length: 20 }).default("informal"),
  hireDate: date("hire_date"),
  contractNumber: varchar("contract_number", { length: 50 }),
  laborBookSeries: varchar("labor_book_series", { length: 20 }),
  laborBookNumber: varchar("labor_book_number", { length: 30 }),
  laborBookIssuedBy: varchar("labor_book_issued_by", { length: 255 }),
  laborBookIssuedDate: date("labor_book_issued_date"),
  contractEndDate: date("contract_end_date"),
  probationMonths: integer("probation_months").default(0),
  shiftId: integer("shift_id"),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, qrCode: true, faceDescriptor: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
