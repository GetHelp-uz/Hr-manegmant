import { Router, type IRouter } from "express";
import { db, employeesTable, companiesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";
import { sendBulkSmsViaEskiz } from "../lib/eskiz";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function getSmsSettings() {
  try {
    const rows = await db.execute(sql`
      SELECT email, password, sender_id, enabled, test_mode
      FROM platform_sms_settings
      LIMIT 1
    `);
    return (rows as any).rows?.[0] || null;
  } catch {
    return null;
  }
}

router.post("/telegram", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { message, targetGroup } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Xabar matni bo'sh bo'lmasin" });
    }
    if (message.length > 4096) {
      return res.status(400).json({ error: "Xabar 4096 belgidan oshmasin" });
    }

    const employees = await db
      .select({ id: employeesTable.id, fullName: employeesTable.fullName, telegramId: employeesTable.telegramId })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.companyId, companyId),
          eq(employeesTable.status, "active"),
          isNotNull(employeesTable.telegramId)
        )
      );

    const targets = targetGroup === "all"
      ? employees
      : employees.filter(e => e.telegramId);

    if (targets.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, total: 0, message: "Telegram bog'langan xodim yo'q" });
    }

    let sent = 0;
    let failed = 0;
    const failedNames: string[] = [];

    for (const emp of targets) {
      if (!emp.telegramId) continue;
      try {
        await sendTelegramMessage(emp.telegramId, message);
        sent++;
      } catch {
        failed++;
        failedNames.push(emp.fullName);
      }
      await new Promise(r => setTimeout(r, 50));
    }

    return res.json({ success: true, sent, failed, total: targets.length, failedNames });
  } catch (err) {
    console.error("Broadcasting telegram error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/sms", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { message, targetGroup } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Xabar matni bo'sh bo'lmasin" });
    }

    const smsCreds = await getSmsSettings();
    if (!smsCreds || !smsCreds.enabled) {
      return res.status(400).json({ error: "SMS xizmati sozlanmagan yoki o'chirilgan. Super admin SMS Eskiz integratsiyasini yoqsin." });
    }

    const employees = await db
      .select({ id: employeesTable.id, fullName: employeesTable.fullName, phone: employeesTable.phone })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.companyId, companyId),
          eq(employeesTable.status, "active"),
          isNotNull(employeesTable.phone)
        )
      );

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

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;

    const allEmployees = await db
      .select({
        id: employeesTable.id,
        telegramId: employeesTable.telegramId,
        phone: employeesTable.phone,
      })
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active")));

    const telegramCount = allEmployees.filter(e => e.telegramId).length;
    const phoneCount = allEmployees.filter(e => e.phone).length;

    const smsCreds = await getSmsSettings();
    const smsEnabled = !!(smsCreds?.enabled);

    return res.json({
      total: allEmployees.length,
      telegramConnected: telegramCount,
      phoneCount,
      smsEnabled,
    });
  } catch (err) {
    console.error("Broadcasting stats error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
