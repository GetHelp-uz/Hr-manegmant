import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  deviceName: varchar("device_name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({ id: true, createdAt: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
