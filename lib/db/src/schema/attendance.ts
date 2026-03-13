import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";
import { devicesTable } from "./devices";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workHours: numeric("work_hours", { precision: 5, scale: 2 }),
  deviceId: integer("device_id").references(() => devicesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
