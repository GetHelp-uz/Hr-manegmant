import { Router } from "express";
import { db, employeesTable, employeeActivityTable, companiesTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

const router = Router();

router.post("/event", async (req, res) => {
  const sessionCompanyId = Number((req.session as any)?.companyId);
  const { employeeId, event, deviceLabel, snapshotPhoto } = req.body;
  const companyId = sessionCompanyId || Number(req.body.companyId);
  if (!companyId || !employeeId || !event) return res.status(400).json({ error: "Missing fields" });
  const validEvents = ["present", "away", "detected", "undetected"];
  if (!validEvents.includes(event)) return res.status(400).json({ error: "Invalid event" });
  try {
    await db.insert(employeeActivityTable).values({
      companyId: Number(companyId),
      employeeId: Number(employeeId),
      event,
      deviceLabel: deviceLabel || null,
      snapshotPhoto: snapshotPhoto || null,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

router.get("/status", async (req, res) => {
  const companyId = Number((req.session as any)?.companyId);
  if (!companyId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const employees = await db.select().from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active")));
    const recentActivity = await db.select().from(employeeActivityTable)
      .where(and(eq(employeeActivityTable.companyId, companyId), gte(employeeActivityTable.detectedAt, since)))
      .orderBy(desc(employeeActivityTable.detectedAt));

    const statusMap: Record<number, { event: string; detectedAt: Date; deviceLabel: string | null }> = {};
    for (const act of recentActivity) {
      if (!statusMap[act.employeeId]) {
        statusMap[act.employeeId] = { event: act.event, detectedAt: act.detectedAt, deviceLabel: act.deviceLabel };
      }
    }

    const result = employees.map(emp => ({
      id: emp.id,
      fullName: emp.fullName,
      position: emp.position,
      lastEvent: statusMap[emp.id]?.event || "unknown",
      lastSeen: statusMap[emp.id]?.detectedAt || null,
      deviceLabel: statusMap[emp.id]?.deviceLabel || null,
      isActive: statusMap[emp.id] && (Date.now() - new Date(statusMap[emp.id].detectedAt).getTime()) < 10 * 60 * 1000,
    }));

    const atDesk = result.filter(e => e.lastEvent === "present" && e.isActive).length;
    const away = result.filter(e => (e.lastEvent === "away" || !e.isActive) && e.lastSeen).length;

    res.json({ employees: result, summary: { total: employees.length, atDesk, away, unknown: employees.length - atDesk - away } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

router.get("/history/:employeeId", async (req, res) => {
  const companyId = Number((req.session as any)?.companyId);
  if (!companyId) return res.status(401).json({ error: "Unauthorized" });
  const employeeId = Number(req.params.employeeId);
  try {
    const since = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const history = await db.select().from(employeeActivityTable)
      .where(and(
        eq(employeeActivityTable.companyId, companyId),
        eq(employeeActivityTable.employeeId, employeeId),
        gte(employeeActivityTable.detectedAt, since)
      ))
      .orderBy(desc(employeeActivityTable.detectedAt))
      .limit(100);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
