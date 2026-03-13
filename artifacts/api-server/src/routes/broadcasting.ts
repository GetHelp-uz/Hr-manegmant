import { Router, type IRouter } from "express";
import { db, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";
import { sendBulkSmsViaEskiz } from "../lib/eskiz";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

async function getSmsSettings() {
  try {
    const result = await withTimeout(
      db.execute(sql`SELECT email, password, sender_id, enabled, test_mode FROM platform_sms_settings LIMIT 1`).catch(() => null),
      5000, null
    );
    return (result as any)?.rows?.[0] || null;
  } catch {
    return null;
  }
}

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;

    const allEmployees = await db
      .select({
        id: employeesTable.id,
        telegramId: employeesTable.telegramId,
        phone: employeesTable.phone,
        departmentId: employeesTable.departmentId,
      })
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active")));

    const departments = await db
      .select({ id: departmentsTable.id, name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.companyId, companyId));

    const deptStats = departments.map(d => ({
      id: d.id,
      name: d.name,
      total: allEmployees.filter(e => e.departmentId === d.id).length,
      telegramCount: allEmployees.filter(e => e.departmentId === d.id && e.telegramId).length,
      smsCount: allEmployees.filter(e => e.departmentId === d.id && e.phone).length,
    }));

    const smsCreds = await getSmsSettings();

    return res.json({
      total: allEmployees.length,
      telegramConnected: allEmployees.filter(e => e.telegramId).length,
      phoneCount: allEmployees.filter(e => e.phone).length,
      smsEnabled: !!(smsCreds?.enabled),
      departments: deptStats,
    });
  } catch (err) {
    console.error("Broadcasting stats error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/recipients", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { channel, departmentId } = req.query as any;

    const conditions: any[] = [
      eq(employeesTable.companyId, companyId),
      eq(employeesTable.status, "active"),
    ];

    if (departmentId && departmentId !== "all") {
      conditions.push(eq(employeesTable.departmentId, parseInt(departmentId)));
    }

    if (channel === "telegram") {
      conditions.push(isNotNull(employeesTable.telegramId));
    }

    const employees = await db
      .select({
        id: employeesTable.id,
        fullName: employeesTable.fullName,
        telegramId: employeesTable.telegramId,
        phone: employeesTable.phone,
        position: employeesTable.position,
        departmentId: employeesTable.departmentId,
      })
      .from(employeesTable)
      .where(and(...conditions));

    return res.json({ employees });
  } catch (err) {
    console.error("Broadcasting recipients error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/telegram", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { message, departmentId, employeeIds } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Xabar matni bo'sh bo'lmasin" });
    }
    if (message.length > 4096) {
      return res.status(400).json({ error: "Xabar 4096 belgidan oshmasin" });
    }

    const conditions: any[] = [
      eq(employeesTable.companyId, companyId),
      eq(employeesTable.status, "active"),
      isNotNull(employeesTable.telegramId),
    ];

    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      conditions.push(inArray(employeesTable.id, employeeIds));
    } else if (departmentId && departmentId !== "all") {
      conditions.push(eq(employeesTable.departmentId, parseInt(departmentId)));
    }

    const employees = await db
      .select({ id: employeesTable.id, fullName: employeesTable.fullName, telegramId: employeesTable.telegramId })
      .from(employeesTable)
      .where(and(...conditions));

    if (employees.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, total: 0, message: "Telegram bog'langan xodim yo'q" });
    }

    let sent = 0;
    let failed = 0;
    const failedNames: string[] = [];

    for (const emp of employees) {
      if (!emp.telegramId) continue;
      try {
        await sendTelegramMessage(emp.telegramId, message);
        sent++;
      } catch {
        failed++;
        failedNames.push(emp.fullName);
      }
      await new Promise(r => setTimeout(r, 60));
    }

    return res.json({ success: true, sent, failed, total: employees.length, failedNames });
  } catch (err) {
    console.error("Broadcasting telegram error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/sms", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { message, departmentId, employeeIds } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Xabar matni bo'sh bo'lmasin" });
    }

    const smsCreds = await getSmsSettings();
    if (!smsCreds || !smsCreds.enabled) {
      return res.status(400).json({
        error: "SMS xizmati sozlanmagan yoki o'chirilgan. Super admin Eskiz integratsiyasini yoqsin.",
      });
    }

    const conditions: any[] = [
      eq(employeesTable.companyId, companyId),
      eq(employeesTable.status, "active"),
      isNotNull(employeesTable.phone),
    ];

    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      conditions.push(inArray(employeesTable.id, employeeIds));
    } else if (departmentId && departmentId !== "all") {
      conditions.push(eq(employeesTable.departmentId, parseInt(departmentId)));
    }

    const employees = await db
      .select({ id: employeesTable.id, fullName: employeesTable.fullName, phone: employeesTable.phone })
      .from(employeesTable)
      .where(and(...conditions));

    if (employees.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, total: 0, message: "Telefon raqami bo'lgan xodim yo'q" });
    }

    const messages = employees.map(e => ({ phone: e.phone, message }));

    const result = await sendBulkSmsViaEskiz(
      smsCreds.email,
      smsCreds.password,
      messages,
      smsCreds.sender_id || "4546",
      smsCreds.test_mode === true || smsCreds.test_mode === "true"
    );

    return res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: employees.length,
      errors: result.errors.slice(0, 5),
    });
  } catch (err) {
    console.error("Broadcasting SMS error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
