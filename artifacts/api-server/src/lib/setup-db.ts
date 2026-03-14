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
  [`CREATE TABLE IF NOT EXISTS branches (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    address varchar(500),
    phone varchar(50),
    timezone varchar(100) DEFAULT 'Asia/Tashkent',
    manager_id integer,
    status varchar(20) NOT NULL DEFAULT 'active',
    notes text,
    created_at timestamptz DEFAULT now()
  )`, "branches"],
  [`CREATE TABLE IF NOT EXISTS schedules (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    branch_id integer REFERENCES branches(id) ON DELETE SET NULL,
    day_of_week integer NOT NULL,
    shift_start time NOT NULL,
    shift_end time NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
  )`, "schedules"],
  [`CREATE TABLE IF NOT EXISTS sales (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id integer REFERENCES branches(id) ON DELETE SET NULL,
    employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
    amount numeric(15,2) NOT NULL,
    items_count integer DEFAULT 0,
    source varchar(50) DEFAULT 'manual',
    external_ref varchar(100),
    notes text,
    sale_time timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
  )`, "sales"],
  [`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id integer REFERENCES branches(id) ON DELETE SET NULL`, "attendance.branch_id"],
  [`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_type varchar(50) DEFAULT 'qr'`, "attendance.device_type"],
  [`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location varchar(255)`, "attendance.location"],
  [`ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id integer REFERENCES branches(id) ON DELETE SET NULL`, "employees.branch_id"],
  [`ALTER TABLE payroll ADD COLUMN IF NOT EXISTS penalty_amount numeric(15,2) DEFAULT 0`, "payroll.penalty_amount"],
  [`ALTER TABLE payroll ADD COLUMN IF NOT EXISTS sales_bonus numeric(15,2) DEFAULT 0`, "payroll.sales_bonus"],
  [`ALTER TABLE branches ADD COLUMN IF NOT EXISTS shift_id integer REFERENCES company_shifts(id) ON DELETE SET NULL`, "branches.shift_id"],
  [`ALTER TABLE employees ADD COLUMN IF NOT EXISTS nfc_card_id varchar(100)`, "employees.nfc_card_id"],
  [`CREATE UNIQUE INDEX IF NOT EXISTS nfc_card_unique ON employees (company_id, nfc_card_id) WHERE nfc_card_id IS NOT NULL`, "employees.nfc_card_unique_idx"],
  [`CREATE TABLE IF NOT EXISTS skud_devices (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    location varchar(255),
    ip_address varchar(50),
    device_type varchar(30) NOT NULL DEFAULT 'entry',
    api_token varchar(128) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now()
  )`, "skud_devices"],
  [`CREATE TABLE IF NOT EXISTS skud_events (
    id serial PRIMARY KEY,
    company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id integer REFERENCES skud_devices(id) ON DELETE SET NULL,
    employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
    card_id varchar(100),
    direction varchar(10) DEFAULT 'in',
    access_granted boolean NOT NULL DEFAULT false,
    note varchar(255),
    created_at timestamptz DEFAULT now()
  )`, "skud_events"],
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
