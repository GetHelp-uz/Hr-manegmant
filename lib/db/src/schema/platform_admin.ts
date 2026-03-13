import { pgTable, serial, varchar, text, boolean, integer, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";
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

export const platformFaceSettingsTable = pgTable("platform_face_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).default("browser"),
  apiUrl: text("api_url"),
  apiKey: text("api_key"),
  apiKeyHint: varchar("api_key_hint", { length: 30 }),
  model: varchar("model", { length: 100 }).default("VGG-Face"),
  threshold: numeric("threshold", { precision: 4, scale: 2 }).default("0.60"),
  enabled: boolean("enabled").default(false),
  livenessEnabled: boolean("liveness_enabled").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformPlansTable = pgTable("platform_plans", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  nameUz: varchar("name_uz", { length: 100 }),
  price: integer("price").default(0),
  maxEmployees: integer("max_employees").default(10),
  maxDevices: integer("max_devices").default(1),
  hasQr: boolean("has_qr").default(true),
  hasFace: boolean("has_face").default(false),
  hasAi: boolean("has_ai").default(false),
  hasDeepFace: boolean("has_deep_face").default(false),
  hasBroadcasting: boolean("has_broadcasting").default(false),
  hasAdvancedReports: boolean("has_advanced_reports").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
