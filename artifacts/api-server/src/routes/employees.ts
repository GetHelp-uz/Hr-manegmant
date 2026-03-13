import { Router, type IRouter } from "express";
import { db, employeesTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import QRCode from "qrcode";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const { search, position, page = "1", limit = "20" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = eq(employeesTable.companyId, companyId);

    const employees = await db.query.employeesTable.findMany({
      where: whereClause,
      limit: limitNum,
      offset,
      orderBy: (emp, { desc }) => [desc(emp.createdAt)],
    });

    const filtered = employees.filter((e) => {
      if (search && !e.fullName.toLowerCase().includes((search as string).toLowerCase()) &&
          !e.phone.includes(search as string)) return false;
      if (position && e.position !== position) return false;
      return true;
    });

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(whereClause);

    return res.json({
      data: filtered.map(formatEmployee),
      total: countResult?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;

    const { fullName, phone, position, salaryType, hourlyRate, monthlySalary, telegramId } = req.body;

    const [employee] = await db.insert(employeesTable).values({
      companyId,
      fullName,
      phone,
      position,
      salaryType: salaryType || "monthly",
      hourlyRate: hourlyRate?.toString(),
      monthlySalary: monthlySalary?.toString(),
      telegramId,
    }).returning();

    const qrData = JSON.stringify({ employee_id: employee.id, company_id: companyId });
    const qrCode = await QRCode.toDataURL(qrData);

    const [updated] = await db.update(employeesTable)
      .set({ qrCode })
      .where(eq(employeesTable.id, employee.id))
      .returning();

    return res.status(201).json(formatEmployee(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const id = parseInt(req.params.id);

    const employee = await db.query.employeesTable.findFirst({
      where: and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)),
    });

    if (!employee) {
      return res.status(404).json({ error: "not_found", message: "Employee not found" });
    }

    return res.json(formatEmployee(employee));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const id = parseInt(req.params.id);

    const { fullName, phone, position, salaryType, hourlyRate, monthlySalary, telegramId } = req.body;

    const existing = await db.query.employeesTable.findFirst({
      where: and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)),
    });

    if (!existing) {
      return res.status(404).json({ error: "not_found", message: "Employee not found" });
    }

    const [updated] = await db.update(employeesTable)
      .set({
        fullName: fullName ?? existing.fullName,
        phone: phone ?? existing.phone,
        position: position ?? existing.position,
        salaryType: salaryType ?? existing.salaryType,
        hourlyRate: hourlyRate?.toString() ?? existing.hourlyRate,
        monthlySalary: monthlySalary?.toString() ?? existing.monthlySalary,
        telegramId: telegramId ?? existing.telegramId,
      })
      .where(eq(employeesTable.id, id))
      .returning();

    return res.json(formatEmployee(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const id = parseInt(req.params.id);

    const existing = await db.query.employeesTable.findFirst({
      where: and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)),
    });

    if (!existing) {
      return res.status(404).json({ error: "not_found", message: "Employee not found" });
    }

    await db.delete(employeesTable).where(eq(employeesTable.id, id));

    return res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/qr", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const id = parseInt(req.params.id);

    const employee = await db.query.employeesTable.findFirst({
      where: and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)),
    });

    if (!employee) {
      return res.status(404).json({ error: "not_found", message: "Employee not found" });
    }

    let qrCode = employee.qrCode;
    if (!qrCode) {
      const qrData = JSON.stringify({ employee_id: employee.id, company_id: companyId });
      qrCode = await QRCode.toDataURL(qrData);
      await db.update(employeesTable).set({ qrCode }).where(eq(employeesTable.id, id));
    }

    return res.json({ qrCode, employeeId: id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

function formatEmployee(e: any) {
  return {
    id: e.id,
    companyId: e.companyId,
    fullName: e.fullName,
    phone: e.phone,
    position: e.position,
    salaryType: e.salaryType,
    hourlyRate: e.hourlyRate ? parseFloat(e.hourlyRate) : null,
    monthlySalary: e.monthlySalary ? parseFloat(e.monthlySalary) : null,
    qrCode: e.qrCode,
    telegramId: e.telegramId,
    createdAt: e.createdAt,
  };
}

export default router;
