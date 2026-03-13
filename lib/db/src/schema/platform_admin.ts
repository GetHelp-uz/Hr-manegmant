import { pgTable, serial, varchar, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const platformAiSettingsTable = pgTable("platform_ai_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull(),
  apiKey: text("api_key"),
  apiKeyHint: varchar("api_key_hint", { length: 30 }),
  model: varchar("model", { length: 100 }),
  enabled: boolean("enabled").default(false),
  settings: jsonb("settings").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyAiAccessTable = pgTable("company_ai_access", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(false),
  monthlyLimit: integer("monthly_limit").default(500),
});

export const companyIntegrationsTable = pgTable("company_integrations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  enabled: boolean("enabled").default(false),
  connectedAt: timestamp("connected_at"),
  settings: jsonb("settings").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformAnnouncementsTable = pgTable("platform_announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  target: varchar("target", { length: 50 }).default("all"),
  targetCompanyId: integer("target_company_id"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }).default("platform_admin"),
});

export const adminActionLogTable = pgTable("admin_action_log", {
  id: serial("id").primaryKey(),
  admin: varchar("admin", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: integer("target_id"),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSmsSettingsTable = pgTable("platform_sms_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).default("eskiz"),
  email: varchar("email", { length: 255 }),
  password: text("password"),
  senderId: varchar("sender_id", { length: 50 }).default("4546"),
  enabled: boolean("enabled").default(false),
  testMode: boolean("test_mode").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
