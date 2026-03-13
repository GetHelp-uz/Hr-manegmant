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
  [`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code varchar(20)`, "employees.employee_code"],
  [`CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_code ON employees(employee_code) WHERE employee_code IS NOT NULL`, "employees.employee_code_idx"],
  [`ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_login varchar(100)`, "devices.device_login"],
  [`ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_password varchar(100)`, "devices.device_password"],
  [`ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_descriptor text`, "employees.face_descriptor"],
  [`ALTER TABLE companies ADD COLUMN IF NOT EXISTS attendance_method varchar(20) DEFAULT 'qr'`, "companies.attendance_method"],
  [`CREATE TABLE IF NOT EXISTS platform_face_settings (
    id serial PRIMARY KEY,
    provider varchar(50) DEFAULT 'browser',
    api_url text,
    api_key text,
    api_key_hint varchar(30),
    model varchar(100) DEFAULT 'VGG-Face',
    threshold numeric(4,2) DEFAULT 0.60,
    enabled boolean DEFAULT false,
    liveness_enabled boolean DEFAULT false,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`, "platform_face_settings"],
  [`CREATE TABLE IF NOT EXISTS platform_plans (
    id serial PRIMARY KEY,
    key varchar(50) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    name_uz varchar(100),
    price integer DEFAULT 0,
    max_employees integer DEFAULT 10,
    max_devices integer DEFAULT 1,
    has_qr boolean DEFAULT true,
    has_face boolean DEFAULT false,
    has_ai boolean DEFAULT false,
    has_deep_face boolean DEFAULT false,
    has_broadcasting boolean DEFAULT false,
    has_advanced_reports boolean DEFAULT false,
    has_api_access boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`, "platform_plans"],
  [`INSERT INTO platform_plans (key, name, name_uz, price, max_employees, max_devices, has_qr, has_face, has_ai, has_deep_face, has_broadcasting, has_advanced_reports, has_api_access, sort_order)
    VALUES
      ('free', 'Free', 'Bepul', 0, 10, 1, true, false, false, false, false, false, false, 0),
      ('starter', 'Starter', 'Boshlang''ich', 99000, 50, 2, true, true, false, false, false, false, false, 1),
      ('pro', 'Professional', 'Professional', 299000, 200, 5, true, true, true, false, true, true, false, 2),
      ('enterprise', 'Enterprise', 'Korporativ', 0, -1, -1, true, true, true, true, true, true, true, 3)
    ON CONFLICT (key) DO NOTHING`, "platform_plans.seed"],
  [`CREATE TABLE IF NOT EXISTS bot_user_states (
    chat_id varchar(50) PRIMARY KEY,
    step varchar(100) NOT NULL,
    data jsonb DEFAULT '{}',
    updated_at timestamptz DEFAULT now()
  )`, "bot_user_states"],
  [`CREATE TABLE IF NOT EXISTS company_shifts (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    start_time varchar(10) NOT NULL DEFAULT '09:00',
    end_time varchar(10) NOT NULL DEFAULT '18:00',
    days varchar(50) DEFAULT '1,2,3,4,5',
    is_default boolean DEFAULT false,
    color varchar(20) DEFAULT '#3b82f6',
    created_at timestamptz DEFAULT now()
  )`, "company_shifts"],
  [`CREATE TABLE IF NOT EXISTS company_audit_log (
    id serial PRIMARY KEY,
    company_id integer NOT NULL,
    user_login varchar(100),
    action varchar(100) NOT NULL,
    target_type varchar(50),
    target_id integer,
    details jsonb DEFAULT '{}',
    ip varchar(50),
    created_at timestamptz DEFAULT now()
  )`, "company_audit_log"],
  [`ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_id integer`, "employees.shift_id"],
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
