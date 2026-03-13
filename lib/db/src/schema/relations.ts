import { relations } from "drizzle-orm";
import { companiesTable } from "./companies";
import { adminsTable } from "./admins";
import { departmentsTable } from "./departments";
import { employeesTable } from "./employees";
import { devicesTable } from "./devices";
import { attendanceTable } from "./attendance";
import { payrollTable } from "./payroll";
import { leaveRequestsTable } from "./leave_requests";
import { auditLogTable } from "./audit_log";

export const companiesRelations = relations(companiesTable, ({ many }) => ({
  admins: many(adminsTable),
  employees: many(employeesTable),
  departments: many(departmentsTable),
  devices: many(devicesTable),
  attendance: many(attendanceTable),
  payroll: many(payrollTable),
  leaveRequests: many(leaveRequestsTable),
  auditLogs: many(auditLogTable),
}));

export const adminsRelations = relations(adminsTable, ({ one }) => ({
  company: one(companiesTable, { fields: [adminsTable.companyId], references: [companiesTable.id] }),
}));

export const departmentsRelations = relations(departmentsTable, ({ one, many }) => ({
  company: one(companiesTable, { fields: [departmentsTable.companyId], references: [companiesTable.id] }),
  employees: many(employeesTable),
}));

export const employeesRelations = relations(employeesTable, ({ one, many }) => ({
  company: one(companiesTable, { fields: [employeesTable.companyId], references: [companiesTable.id] }),
  department: one(departmentsTable, { fields: [employeesTable.departmentId], references: [departmentsTable.id] }),
  attendance: many(attendanceTable),
  payroll: many(payrollTable),
  leaveRequests: many(leaveRequestsTable),
}));

export const devicesRelations = relations(devicesTable, ({ one }) => ({
  company: one(companiesTable, { fields: [devicesTable.companyId], references: [companiesTable.id] }),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  employee: one(employeesTable, { fields: [attendanceTable.employeeId], references: [employeesTable.id] }),
  company: one(companiesTable, { fields: [attendanceTable.companyId], references: [companiesTable.id] }),
  device: one(devicesTable, { fields: [attendanceTable.deviceId], references: [devicesTable.id] }),
}));

export const payrollRelations = relations(payrollTable, ({ one }) => ({
  employee: one(employeesTable, { fields: [payrollTable.employeeId], references: [employeesTable.id] }),
  company: one(companiesTable, { fields: [payrollTable.companyId], references: [companiesTable.id] }),
}));

export const leaveRequestsRelations = relations(leaveRequestsTable, ({ one }) => ({
  employee: one(employeesTable, { fields: [leaveRequestsTable.employeeId], references: [employeesTable.id] }),
  company: one(companiesTable, { fields: [leaveRequestsTable.companyId], references: [companiesTable.id] }),
}));

export const auditLogRelations = relations(auditLogTable, ({ one }) => ({
  company: one(companiesTable, { fields: [auditLogTable.companyId], references: [companiesTable.id] }),
}));
