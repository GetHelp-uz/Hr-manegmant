import { pgTable, serial, integer, varchar, time, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";
import { branchesTable } from "./branches";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  branchId: integer("branch_id").references(() => branchesTable.id),
  dayOfWeek: integer("day_of_week").notNull(),
  shiftStart: time("shift_start").notNull(),
  shiftEnd: time("shift_end").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
