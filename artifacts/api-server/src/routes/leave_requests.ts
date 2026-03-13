import { Router, type IRouter } from "express";
import { db, leaveRequestsTable, employeesTable, companiesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const requests = await db.query.leaveRequestsTable.findMany({
      where: eq(leaveRequestsTable.companyId, companyId),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    const withEmployee = await Promise.all(
      requests.map(async (r) => {
        const emp = await db.query.employeesTable.findFirst({
          where: eq(employeesTable.id, r.employeeId),
        });
        return { ...r, employee: emp };
      })
    );

    return res.json(withEmployee);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/status", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const reqId = parseInt(req.params.id);
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db.update(leaveRequestsTable)
      .set({
        status,
        adminNote: adminNote || null,
        approvedAt: status === "approved" ? new Date() : null,
      })
      .where(and(eq(leaveRequestsTable.id, reqId), eq(leaveRequestsTable.companyId, companyId)))
      .returning();

    const employee = await db.query.employeesTable.findFirst({
      where: eq(employeesTable.id, updated.employeeId),
    });

    if (employee?.telegramId) {
      const typeNames: Record<string, string> = { vacation: "Ta'til", sick: "Kasallik", other: "Boshqa" };
      const typeName = typeNames[updated.type] || updated.type;
      const statusText = status === "approved" ? "✅ Tasdiqlandi" : "❌ Rad etildi";
      await sendTelegramMessage(
        employee.telegramId,
        `${statusText}\n\n📋 So'rov turi: ${typeName}\n📅 ${updated.startDate} dan ${updated.endDate} gacha\n` +
        (adminNote ? `📝 Admin izohi: ${adminNote}` : "")
      ).catch(() => {});
    }

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/telegram", async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, days, reason } = req.body;

    const employee = await db.query.employeesTable.findFirst({
      where: eq(employeesTable.id, employeeId),
    });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const [request] = await db.insert(leaveRequestsTable).values({
      employeeId,
      companyId: employee.companyId,
      type,
      startDate,
      endDate,
      days,
      reason,
      status: "pending",
    }).returning();

    const company = await db.query.companiesTable.findFirst({
      where: eq(companiesTable.id, employee.companyId),
    });

    if (company?.telegramAdminId) {
      const typeNames: Record<string, string> = { vacation: "Ta'til", sick: "Kasallik", other: "Boshqa" };
      await sendTelegramMessage(
        company.telegramAdminId,
        `🔔 <b>Yangi so'rov!</b>\n\n` +
        `👤 ${employee.fullName}\n` +
        `📋 Tur: ${typeNames[type] || type}\n` +
        `📅 ${startDate} dan ${endDate} gacha (${days} kun)\n` +
        `📝 Sabab: ${reason || "Ko'rsatilmagan"}\n\n` +
        `Dashboard orqali tasdiqlang yoki rad eting.`
      ).catch(() => {});
    }

    return res.json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
