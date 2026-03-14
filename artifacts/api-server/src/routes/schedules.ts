import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { schedulesTable, employeesTable, branchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const DAY_NAMES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { employee_id } = req.query;
    const conditions: any[] = [eq(schedulesTable.companyId, companyId)];
    if (employee_id) conditions.push(eq(schedulesTable.employeeId, parseInt(employee_id as string)));

    const schedules = await db.select().from(schedulesTable).where(and(...conditions));

    const enriched = await Promise.all(schedules.map(async (s) => {
      const [emp] = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName, position: employeesTable.position })
        .from(employeesTable).where(eq(employeesTable.id, s.employeeId));
      let branch = null;
      if (s.branchId) {
        const [b] = await db.select({ id: branchesTable.id, name: branchesTable.name })
          .from(branchesTable).where(eq(branchesTable.id, s.branchId));
        branch = b || null;
      }
      return { ...s, employee: emp || null, branch, dayName: DAY_NAMES[s.dayOfWeek] || "?" };
    }));
    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { employeeId, branchId, dayOfWeek, shiftStart, shiftEnd } = req.body;
    if (!employeeId || dayOfWeek === undefined || !shiftStart || !shiftEnd)
      return res.status(400).json({ error: "validation_error", message: "employeeId, dayOfWeek, shiftStart, shiftEnd required" });
    const [schedule] = await db.insert(schedulesTable).values({
      companyId,
      employeeId: parseInt(employeeId),
      branchId: branchId ? parseInt(branchId) : null,
      dayOfWeek: parseInt(dayOfWeek),
      shiftStart,
      shiftEnd,
      isActive: true,
    }).returning();
    return res.status(201).json(schedule);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/bulk", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { employeeId, branchId, days, shiftStart, shiftEnd } = req.body;
    if (!employeeId || !days?.length || !shiftStart || !shiftEnd)
      return res.status(400).json({ error: "validation_error", message: "employeeId, days[], shiftStart, shiftEnd required" });
    await db.delete(schedulesTable).where(and(eq(schedulesTable.companyId, companyId), eq(schedulesTable.employeeId, parseInt(employeeId))));
    const rows = (days as number[]).map(d => ({
      companyId,
      employeeId: parseInt(employeeId),
      branchId: branchId ? parseInt(branchId) : null,
      dayOfWeek: d,
      shiftStart,
      shiftEnd,
      isActive: true,
    }));
    const inserted = await db.insert(schedulesTable).values(rows).returning();
    return res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    await db.delete(schedulesTable).where(and(eq(schedulesTable.id, parseInt(req.params.id)), eq(schedulesTable.companyId, companyId)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
