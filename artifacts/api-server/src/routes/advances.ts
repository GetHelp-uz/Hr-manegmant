import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { advanceRequestsTable, employeesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";
import { companiesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(advanceRequestsTable.companyId, companyId)];
    if (status && status !== "all") conditions.push(eq(advanceRequestsTable.status, status as string));

    const records = await db.select().from(advanceRequestsTable)
      .where(and(...conditions))
      .orderBy(desc(advanceRequestsTable.createdAt))
      .limit(limitNum).offset(offset);

    const withEmployees = await Promise.all(records.map(async (r) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
      return { ...r, amount: parseFloat(r.amount), employee: emp ? { id: emp.id, fullName: emp.fullName, phone: emp.phone, position: emp.position } : null };
    }));

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(advanceRequestsTable).where(and(...conditions));

    return res.json({ data: withEmployees, total: countResult?.count ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { employeeId, companyId, amount, reason } = req.body;
    if (!employeeId || !companyId || !amount || !reason) {
      return res.status(400).json({ error: "validation_error", message: "employeeId, companyId, amount, reason required" });
    }

    const [emp] = await db.select().from(employeesTable).where(
      and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))
    );
    if (!emp) return res.status(404).json({ error: "not_found", message: "Employee not found" });

    const [record] = await db.insert(advanceRequestsTable).values({
      employeeId, companyId, amount: amount.toString(), reason, status: "pending",
    }).returning();

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (company?.telegramAdminId) {
      await sendTelegramMessage(company.telegramAdminId,
        `💵 <b>Avans so'rovi!</b>\n\n👤 ${emp.fullName}\n💰 Miqdor: <b>${Number(amount).toLocaleString()} so'm</b>\n📝 Sabab: ${reason}\n\n✅ Tasdiqlash uchun admin panelga kiring.`
      ).catch(() => {});
    }

    return res.status(201).json({ ...record, amount: parseFloat(record.amount) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { status, adminNote } = req.body;

    const [existing] = await db.select().from(advanceRequestsTable).where(
      and(eq(advanceRequestsTable.id, id), eq(advanceRequestsTable.companyId, companyId))
    );
    if (!existing) return res.status(404).json({ error: "not_found" });

    const [updated] = await db.update(advanceRequestsTable)
      .set({ status, adminNote: adminNote || null, reviewedAt: new Date() })
      .where(eq(advanceRequestsTable.id, id))
      .returning();

    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, existing.employeeId));

    if (emp?.telegramId) {
      const statusText = status === "approved" ? "✅ Tasdiqlandi" : "❌ Rad etildi";
      const noteText = adminNote ? `\n📝 Admin izohi: ${adminNote}` : "";
      await sendTelegramMessage(emp.telegramId,
        `💵 <b>Avans so'rovi yangilandi</b>\n\n${statusText}\n💰 Miqdor: <b>${Number(existing.amount).toLocaleString()} so'm</b>${noteText}`
      ).catch(() => {});
    }

    return res.json({ ...updated, amount: parseFloat(updated.amount) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
