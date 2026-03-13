import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  logo: text("logo"),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).notNull().default("free"),
  joinCode: varchar("join_code", { length: 20 }).unique(),
  workStartTime: varchar("work_start_time", { length: 10 }).default("09:00"),
  workEndTime: varchar("work_end_time", { length: 10 }).default("18:00"),
  lateThresholdMinutes: varchar("late_threshold_minutes", { length: 5 }).default("15"),
  telegramAdminId: varchar("telegram_admin_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
