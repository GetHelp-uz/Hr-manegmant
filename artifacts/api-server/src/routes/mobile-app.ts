import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";
import crypto from "crypto";

const router: IRouter = Router();

function formatTime(d: Date) {
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDate(d: Date) {
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function calcLate(now: Date, workStart: string, threshold: number) {
  const [h, m] = workStart.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
  return diff > threshold ? diff : 0;
}

// ─── COMPANY KIOSK LOGIN (TimePad tablet) ────────────────────────────
// POST /api/mobile/kiosk-login
// Body: { login, password } — company credentials
router.post("/kiosk-login", async (req, res) => {
  try {
    const { login, password } = req.body;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT c.*, u.id AS user_id, u.password_hash
         FROM companies c
         JOIN users u ON u.company_id = c.id AND u.role = 'admin'
         WHERE c.login = $1 LIMIT 1`,
        [login]
      );
      if (!rows[0]) return res.status(401).json({ error: "not_found", message: "Kompaniya topilmadi" });
      const ok = await bcrypt.compare(password, rows[0].password_hash);
      if (!ok) return res.status(401).json({ error: "wrong_password", message: "Parol noto'g'ri" });
      const company = rows[0];
      (req.session as any).companyId = company.id;
      (req.session as any).userId = company.user_id;
      (req.session as any).role = "admin";
      return res.json({
        success: true,
        company: {
          id: company.id,
          name: company.name,
          login: company.login,
          logo: company.logo,
          attendanceMethods: company.attendance_methods || ["qr"],
          workStartTime: company.work_start_time || "09:00",
        }
      });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── EMPLOYEE APP LOGIN ───────────────────────────────────────────────
// POST /api/mobile/employee-login
// Body: { login, password, companyId? }
router.post("/employee-login", async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: "credentials_required" });
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT e.*, c.name AS company_name, c.telegram_admin_id, c.work_start_time, c.late_threshold_minutes
         FROM employees e
         JOIN companies c ON c.id = e.company_id
         WHERE e.app_login = $1 AND e.status = 'active' LIMIT 1`,
        [login]
      );
      if (!rows[0]) return res.status(401).json({ error: "not_found", message: "Xodim topilmadi" });
      const emp = rows[0];
      if (!emp.app_password) return res.status(401).json({ error: "no_password", message: "Parol o'rnatilmagan. Admin bilan bog'laning." });
      const ok = await bcrypt.compare(password, emp.app_password);
      if (!ok) return res.status(401).json({ error: "wrong_password", message: "Login yoki parol noto'g'ri" });

      // Store employee session
      (req.session as any).employeeId = emp.id;
      (req.session as any).companyId = emp.company_id;
      (req.session as any).role = "employee";

      return res.json({
        success: true,
        employee: {
          id: emp.id,
          fullName: emp.full_name,
          position: emp.position,
          companyId: emp.company_id,
          companyName: emp.company_name,
          attendanceMethod: emp.attendance_method || "qr",
          nfcCardId: emp.nfc_card_id || null,
          timepadCode: emp.timepad_code || null,
          qrCode: emp.qr_code || null,
          photo: emp.photo || null,
        }
      });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── GET EMPLOYEE'S OWN PROFILE (for mobile key app) ─────────────────
router.get("/employee-me", async (req, res) => {
  try {
    const empId = (req.session as any).employeeId;
    const companyId = (req.session as any).companyId;
    if (!empId) return res.status(401).json({ error: "not_authenticated" });

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT e.*, c.name AS company_name, c.work_start_time,
           (SELECT row_to_json(a) FROM attendance a
            WHERE a.employee_id=e.id AND DATE(a.created_at)=CURRENT_DATE LIMIT 1) AS today_attendance
         FROM employees e JOIN companies c ON c.id=e.company_id
         WHERE e.id=$1 AND e.company_id=$2`,
        [empId, companyId]
      );
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      const emp = rows[0];
      return res.json({
        id: emp.id,
        fullName: emp.full_name,
        position: emp.position,
        phone: emp.phone,
        companyName: emp.company_name,
        attendanceMethod: emp.attendance_method || "qr",
        nfcCardId: emp.nfc_card_id || null,
        timepadCode: emp.timepad_code || null,
        qrCode: emp.qr_code || null,
        photo: emp.photo || null,
        salary: emp.salary,
        salaryType: emp.salary_type,
        todayAttendance: emp.today_attendance || null,
      });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── EMPLOYEE LOGOUT ──────────────────────────────────────────────────
router.post("/employee-logout", (req, res) => {
  (req.session as any).employeeId = null;
  (req.session as any).role = null;
  req.session.destroy(() => {});
  return res.json({ success: true });
});

// ─── SET EMPLOYEE APP CREDENTIALS (admin) ────────────────────────────
router.put("/set-employee-credentials/:empId", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const empId = parseInt(req.params.empId);
    const { appLogin, appPassword } = req.body;
    if (!appLogin || !appPassword) return res.status(400).json({ error: "credentials_required" });
    const hash = await bcrypt.hash(appPassword, 10);
    const client = await pool.connect();
    try {
      const { rows: existing } = await client.query(
        `SELECT id FROM employees WHERE company_id=$1 AND app_login=$2 AND id!=$3`,
        [companyId, appLogin, empId]
      );
      if (existing.length > 0) return res.status(409).json({ error: "login_taken", message: "Bu login band" });
      const { rows } = await client.query(
        `UPDATE employees SET app_login=$1, app_password=$2 WHERE id=$3 AND company_id=$4 RETURNING id, full_name, app_login`,
        [appLogin, hash, empId, companyId]
      );
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── SETUP EMPLOYEE COMBINED (admin) — app_login, app_password, method, timepad, nfc ──
router.post("/setup-employee/:empId", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const empId = parseInt(req.params.empId);
    const { appLogin, appPassword, attendanceMethod, timepadCode, nfcCardId } = req.body;

    const valid = ["qr", "nfc", "face", "timepad", "skud"];
    if (attendanceMethod && !valid.includes(attendanceMethod)) return res.status(400).json({ error: "invalid_method" });

    const client = await pool.connect();
    try {
      // Check login uniqueness
      if (appLogin) {
        const { rows: dup } = await client.query(
          `SELECT id FROM employees WHERE company_id=$1 AND app_login=$2 AND id!=$3`,
          [companyId, appLogin, empId]
        );
        if (dup.length > 0) return res.status(409).json({ error: "login_taken", message: "Bu login boshqa xodimda band" });
      }
      // Check timepad code uniqueness
      if (timepadCode) {
        const { rows: dupT } = await client.query(
          `SELECT id FROM employees WHERE company_id=$1 AND timepad_code=$2 AND id!=$3`,
          [companyId, timepadCode, empId]
        );
        if (dupT.length > 0) return res.status(409).json({ error: "timepad_taken", message: "Bu TimePad kod boshqa xodimda band" });
      }

      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;

      if (appLogin) { sets.push(`app_login=$${idx++}`); vals.push(appLogin); }
      if (appPassword) { const hash = await bcrypt.hash(appPassword, 10); sets.push(`app_password=$${idx++}`); vals.push(hash); }
      if (attendanceMethod) { sets.push(`attendance_method=$${idx++}`); vals.push(attendanceMethod); }
      if (timepadCode !== undefined) { sets.push(`timepad_code=$${idx++}`); vals.push(timepadCode || null); }
      if (nfcCardId !== undefined) { sets.push(`nfc_card_id=$${idx++}`); vals.push(nfcCardId || null); }

      if (sets.length === 0) return res.status(400).json({ error: "nothing_to_update" });

      vals.push(empId, companyId);
      const { rows } = await client.query(
        `UPDATE employees SET ${sets.join(", ")} WHERE id=$${idx++} AND company_id=$${idx} RETURNING id, full_name, app_login, attendance_method, timepad_code, nfc_card_id`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── SET ATTENDANCE METHOD (admin) ───────────────────────────────────
router.put("/attendance-method/:empId", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const empId = parseInt(req.params.empId);
    const { method } = req.body;
    const valid = ["qr", "nfc", "face", "timepad", "skud"];
    if (!valid.includes(method)) return res.status(400).json({ error: "invalid_method" });
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE employees SET attendance_method=$1 WHERE id=$2 AND company_id=$3 RETURNING id, full_name, attendance_method`,
        [method, empId, companyId]
      );
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── GENERATE / SET TIMEPAD CODE (admin) ─────────────────────────────
router.post("/gen-timepad/:empId", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const empId = parseInt(req.params.empId);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE employees SET timepad_code=$1 WHERE id=$2 AND company_id=$3 RETURNING id, full_name, timepad_code`,
        [code, empId, companyId]
      );
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── TIMEPAD CHECK (kiosk + employee app) ────────────────────────────
// POST /api/mobile/timepad-check
// Body: { code, companyId, direction? }
router.post("/timepad-check", async (req, res) => {
  try {
    const { code, companyId, direction = "in" } = req.body;
    if (!code || !companyId) return res.status(400).json({ error: "code_and_company_required" });
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT e.*, c.telegram_admin_id, c.work_start_time, c.late_threshold_minutes
         FROM employees e JOIN companies c ON c.id=e.company_id
         WHERE e.timepad_code=$1 AND e.company_id=$2 AND e.status='active' LIMIT 1`,
        [code, companyId]
      );
      if (!rows[0]) return res.status(404).json({ granted: false, message: "Kod noto'g'ri yoki xodim topilmadi" });
      const emp = rows[0];
      const now = new Date();

      if (direction === "in") {
        const { rows: today } = await client.query(
          `SELECT id FROM attendance WHERE employee_id=$1 AND company_id=$2 AND DATE(created_at)=CURRENT_DATE`,
          [emp.id, companyId]
        );
        if (!today[0]) {
          const workStart = emp.work_start_time || "09:00";
          const threshold = parseInt(emp.late_threshold_minutes || "15");
          const lateMinutes = calcLate(now, workStart, threshold);
          const status = lateMinutes > 0 ? "late" : "present";
          await client.query(
            `INSERT INTO attendance (employee_id, company_id, check_in, late_minutes, status, device_type)
             VALUES ($1,$2,$3,$4,$5,'timepad')`,
            [emp.id, companyId, now, lateMinutes, status]
          );
          if (emp.telegram_admin_id) {
            const lateText = lateMinutes > 0 ? `\n⚠️ Kechikish: *${lateMinutes} daqiqa*` : "";
            await sendTelegramMessage(emp.telegram_admin_id,
              `⌨️ *TimePad — Kirish*\n\n👤 ${emp.full_name}\n🕐 ${formatTime(now)} · ${formatDate(now)}${lateText}`
            ).catch(() => {});
          }
          return res.json({ granted: true, action: "check_in", employee: { id: emp.id, fullName: emp.full_name, position: emp.position, photo: emp.photo }, lateMinutes, time: now });
        }
        return res.json({ granted: true, action: "already_checked_in", employee: { id: emp.id, fullName: emp.full_name }, time: now });
      }

      if (direction === "out") {
        await client.query(
          `UPDATE attendance SET check_out=$1 WHERE employee_id=$2 AND company_id=$3 AND DATE(created_at)=CURRENT_DATE AND check_out IS NULL`,
          [now, emp.id, companyId]
        );
        if (emp.telegram_admin_id) {
          await sendTelegramMessage(emp.telegram_admin_id,
            `⌨️ *TimePad — Chiqish*\n\n👤 ${emp.full_name}\n🕐 ${formatTime(now)} · ${formatDate(now)}`
          ).catch(() => {});
        }
        return res.json({ granted: true, action: "check_out", employee: { id: emp.id, fullName: emp.full_name }, time: now });
      }

      return res.json({ granted: true, employee: { id: emp.id, fullName: emp.full_name } });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", granted: false });
  }
});

// ─── KIOSK EMPLOYEE LIST (for face selection) ─────────────────────────
router.get("/kiosk-employees", async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    if (!companyId) return res.status(401).json({ error: "not_authenticated" });
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, full_name, position, photo, attendance_method, timepad_code, qr_code
         FROM employees WHERE company_id=$1 AND status='active' ORDER BY full_name`,
        [companyId]
      );
      return res.json(rows.map(e => ({
        id: e.id,
        fullName: e.full_name,
        position: e.position,
        photo: e.photo,
        attendanceMethod: e.attendance_method,
        timepadCode: e.timepad_code,
        qrCode: e.qr_code,
      })));
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── TODAY ATTENDANCE STATUS ──────────────────────────────────────────
router.get("/today-attendance", async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    if (!companyId) return res.status(401).json({ error: "not_authenticated" });
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT a.*, e.full_name, e.position, e.photo
         FROM attendance a JOIN employees e ON e.id = a.employee_id
         WHERE a.company_id=$1 AND DATE(a.created_at)=CURRENT_DATE
         ORDER BY a.created_at DESC`,
        [companyId]
      );
      return res.json(rows);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
