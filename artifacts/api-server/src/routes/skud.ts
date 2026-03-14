import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { db, attendanceTable, employeesTable, companiesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";
import crypto from "crypto";

const router: IRouter = Router();

function genToken() {
  return crypto.randomBytes(32).toString("hex");
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── DEVICE MANAGEMENT ───────────────────────────────────────────────

router.get("/devices", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT d.*, COUNT(e.id) FILTER (WHERE DATE(e.created_at) = CURRENT_DATE) AS events_today
         FROM skud_devices d
         LEFT JOIN skud_events e ON e.device_id = d.id
         WHERE d.company_id = $1
         GROUP BY d.id ORDER BY d.created_at ASC`,
        [companyId]
      );
      return res.json(rows);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/devices", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, location, ipAddress, deviceType } = req.body;
    if (!name) return res.status(400).json({ error: "name_required" });
    const token = genToken();
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO skud_devices (company_id, name, location, ip_address, device_type, api_token)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [companyId, name, location || null, ipAddress || null, deviceType || "entry", token]
      );
      return res.status(201).json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/devices/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { name, location, ipAddress, deviceType, status } = req.body;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE skud_devices SET name=$1,location=$2,ip_address=$3,device_type=$4,status=$5
         WHERE id=$6 AND company_id=$7 RETURNING *`,
        [name, location || null, ipAddress || null, deviceType || "entry", status || "active", id, companyId]
      );
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/devices/:id/regen-token", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const token = genToken();
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE skud_devices SET api_token=$1 WHERE id=$2 AND company_id=$3 RETURNING *`,
        [token, id, companyId]
      );
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/devices/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM skud_devices WHERE id=$1 AND company_id=$2`, [id, companyId]);
      return res.json({ success: true });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── EVENTS LOG ──────────────────────────────────────────────────────

router.get("/events", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const limit = Math.min(parseInt(req.query.limit as string || "50"), 200);
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT e.*,
           emp.full_name AS employee_name,
           emp.position AS employee_position,
           d.name AS device_name, d.location AS device_location, d.device_type
         FROM skud_events e
         LEFT JOIN employees emp ON emp.id = e.employee_id
         LEFT JOIN skud_devices d ON d.id = e.device_id
         WHERE e.company_id = $1
         ORDER BY e.created_at DESC LIMIT $2`,
        [companyId, limit]
      );
      return res.json(rows);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS today_total,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND access_granted = true) AS today_granted,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND access_granted = false) AS today_denied,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND direction = 'in' AND access_granted = true) AS today_checkins
         FROM skud_events WHERE company_id = $1`,
        [companyId]
      );
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── NFC CARD ASSIGNMENT ─────────────────────────────────────────────

router.put("/nfc/:employeeId", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const empId = parseInt(req.params.employeeId);
    const { nfcCardId } = req.body;
    const client = await pool.connect();
    try {
      if (nfcCardId) {
        const { rows: existing } = await client.query(
          `SELECT id, full_name FROM employees WHERE company_id=$1 AND nfc_card_id=$2 AND id != $3`,
          [companyId, nfcCardId, empId]
        );
        if (existing.length > 0) {
          return res.status(409).json({
            error: "card_taken",
            message: `Bu karta allaqachon ${existing[0].full_name} ga biriktirilgan`
          });
        }
      }
      const { rows } = await client.query(
        `UPDATE employees SET nfc_card_id=$1 WHERE id=$2 AND company_id=$3 RETURNING id, full_name, nfc_card_id`,
        [nfcCardId || null, empId, companyId]
      );
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── СКУД CHECK (PUBLIC — device calls this) ─────────────────────────
// Headers: x-device-token: <token>
// Body: { cardId, direction?: "in"|"out" }

router.post("/check", async (req, res) => {
  try {
    const deviceToken = req.headers["x-device-token"] as string;
    if (!deviceToken) return res.status(401).json({ error: "no_token", granted: false });

    const { cardId, direction = "in" } = req.body;
    if (!cardId) return res.status(400).json({ error: "card_id_required", granted: false });

    const client = await pool.connect();
    try {
      // Verify device
      const { rows: devices } = await client.query(
        `SELECT * FROM skud_devices WHERE api_token=$1 AND status='active'`,
        [deviceToken]
      );
      if (!devices[0]) return res.status(401).json({ error: "invalid_token", granted: false });
      const device = devices[0];
      const companyId = device.company_id;

      // Find employee by NFC card
      const { rows: emps } = await client.query(
        `SELECT e.*, c.telegram_admin_id, c.work_start_time, c.late_threshold_minutes
         FROM employees e
         JOIN companies c ON c.id = e.company_id
         WHERE e.nfc_card_id=$1 AND e.company_id=$2 AND e.status='active'`,
        [cardId, companyId]
      );

      const now = new Date();
      const granted = emps.length > 0;
      const employee = emps[0];

      // Log event
      const { rows: events } = await client.query(
        `INSERT INTO skud_events (company_id, device_id, employee_id, card_id, direction, access_granted, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          companyId, device.id,
          employee?.id || null,
          cardId, direction, granted,
          granted ? null : "Karta topilmadi yoki xodim nofaol"
        ]
      );

      // If granted + direction=in, auto create/update attendance
      if (granted && direction === "in") {
        const { rows: today } = await client.query(
          `SELECT id FROM attendance WHERE employee_id=$1 AND company_id=$2 AND DATE(created_at)=CURRENT_DATE`,
          [employee.id, companyId]
        );
        if (!today[0]) {
          const workStart = employee.work_start_time || "09:00";
          const threshold = parseInt(employee.late_threshold_minutes || "15");
          const [h, m] = workStart.split(":").map(Number);
          const start = new Date(now);
          start.setHours(h, m, 0, 0);
          const diffMin = Math.floor((now.getTime() - start.getTime()) / 60000);
          const lateMinutes = diffMin > threshold ? diffMin : 0;
          const status = lateMinutes > 0 ? "late" : "present";

          await client.query(
            `INSERT INTO attendance (employee_id, company_id, check_in, late_minutes, status, device_id, device_type)
             VALUES ($1,$2,$3,$4,$5,$6,'skud')`,
            [employee.id, companyId, now, lateMinutes, status, device.id]
          );

          // Telegram notify admin
          if (employee.telegram_admin_id) {
            const lateText = lateMinutes > 0 ? `\n⚠️ Kechikish: *${lateMinutes} daqiqa*` : "";
            const msg = `🚪 *СКУД — Kirish*\n\n👤 ${employee.full_name}\n📍 ${device.name} (${device.location || "—"})\n🕐 ${fmtTime(now)} · ${fmtDate(now)}${lateText}`;
            await sendTelegramMessage(employee.telegram_admin_id, msg).catch(() => {});
          }

          return res.json({
            granted: true,
            action: "check_in",
            employee: { id: employee.id, fullName: employee.full_name, position: employee.position },
            device: { name: device.name, location: device.location },
            time: now,
            lateMinutes,
            message: `✅ Kirish ruxsat berildi — ${employee.full_name}`,
          });
        } else {
          return res.json({
            granted: true,
            action: "already_checked_in",
            employee: { id: employee.id, fullName: employee.full_name },
            message: `ℹ️ ${employee.full_name} bugun allaqachon kirib bo'lgan`,
          });
        }
      }

      // direction=out: update checkout
      if (granted && direction === "out") {
        await client.query(
          `UPDATE attendance SET check_out=$1 WHERE employee_id=$2 AND company_id=$3 AND DATE(created_at)=CURRENT_DATE AND check_out IS NULL`,
          [now, employee.id, companyId]
        );
        if (employee.telegram_admin_id) {
          const msg = `🚪 *СКУД — Chiqish*\n\n👤 ${employee.full_name}\n📍 ${device.name}\n🕐 ${fmtTime(now)} · ${fmtDate(now)}`;
          await sendTelegramMessage(employee.telegram_admin_id, msg).catch(() => {});
        }
        return res.json({
          granted: true,
          action: "check_out",
          employee: { id: employee.id, fullName: employee.full_name },
          message: `✅ Chiqish qayd etildi — ${employee.full_name}`,
        });
      }

      // Not found
      if (!granted) {
        if (device.telegram_admin_id || emps[0]?.telegram_admin_id) {
          const adminId = (emps[0]?.telegram_admin_id) || null;
          if (adminId) {
            const msg = `🚫 *СКУД — Ruxsatsiz kirish urinishi*\n\n💳 Karta: \`${cardId}\`\n📍 ${device.name}\n🕐 ${fmtTime(now)}`;
            await sendTelegramMessage(adminId, msg).catch(() => {});
          }
        }
        return res.status(403).json({
          granted: false,
          action: "denied",
          message: "❌ Ruxsat yo'q — karta ro'yxatda topilmadi",
        });
      }

      return res.json({ granted, message: "OK" });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", granted: false });
  }
});

export default router;
