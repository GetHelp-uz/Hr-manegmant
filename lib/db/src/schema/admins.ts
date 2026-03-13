import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  login: varchar("login", { length: 100 }).unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminSchema = createInsertSchema(adminsTable).omit({ id: true, createdAt: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;
