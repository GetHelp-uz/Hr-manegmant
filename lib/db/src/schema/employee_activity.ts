import { pgTable, serial, integer, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const employeeActivityTable = pgTable("employee_activity", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  event: varchar("event", { length: 30 }).notNull(),
  deviceLabel: varchar("device_label", { length: 100 }),
  snapshotPhoto: text("snapshot_photo"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
});

export type EmployeeActivity = typeof employeeActivityTable.$inferSelect;
