import { pool } from "@workspace/db";

const DDL_STATEMENTS: [string, string][] = [
  [`ALTER TABLE companies ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active'`, "companies.status"],
  [`ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes text`, "companies.notes"],
  [`CREATE TABLE IF NOT EXISTS company_integrations (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type varchar(50) NOT NULL,
    enabled boolean DEFAULT false,
    connected_at timestamptz,
    settings jsonb DEFAULT '{}',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(company_id, type)
  )`, "company_integrations"],
  [`CREATE TABLE IF NOT EXISTS platform_announcements (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    target varchar(50) DEFAULT 'all',
    target_company_id integer,
    created_at timestamptz DEFAULT now(),
    created_by varchar(100) DEFAULT 'platform_admin'
  )`, "platform_announcements"],
  [`CREATE TABLE IF NOT EXISTS admin_action_log (
    id serial PRIMARY KEY,
    admin varchar(100) NOT NULL,
    action varchar(100) NOT NULL,
    target_type varchar(50),
    target_id integer,
    details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
  )`, "admin_action_log"],
  [`CREATE TABLE IF NOT EXISTS platform_ai_settings (
    id serial PRIMARY KEY,
    provider varchar(50) NOT NULL,
    api_key text,
    api_key_hint varchar(30),
    model varchar(100),
    enabled boolean DEFAULT false,
    settings jsonb DEFAULT '{}',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`, "platform_ai_settings"],
  [`CREATE TABLE IF NOT EXISTS company_ai_access (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    enabled boolean DEFAULT false,
    monthly_limit integer DEFAULT 500,
    UNIQUE(company_id)
  )`, "company_ai_access"],
];

export async function setupAdminTables() {
  let client: any;
  try {
    client = await pool.connect();
  } catch (err: any) {
    console.error(`[setup-db] Cannot acquire connection: ${err.message}`);
    return;
  }
  try {
    for (const [ddl, label] of DDL_STATEMENTS) {
      try {
        await client.query(ddl);
        console.log(`[setup-db] ${label}: OK`);
      } catch (err: any) {
        const msg = err.message || String(err);
        if (!msg.includes("already exists")) {
          console.error(`[setup-db] ${label}: ${msg.slice(0, 120)}`);
        }
      }
    }
    console.log("[setup-db] All admin tables ready");
  } finally {
    client.release();
  }
}
