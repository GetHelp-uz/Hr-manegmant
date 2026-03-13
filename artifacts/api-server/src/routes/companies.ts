import { Router, type IRouter } from "express";
import { db, companiesTable, employeesTable, devicesTable, attendanceTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (!company) return res.status(404).json({ error: "not_found" });

    return res.json({
      id: company.id, name: company.name, phone: company.phone,
      email: company.email, logo: company.logo,
      subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, phone, logo } = req.body;
    const [updated] = await db.update(companiesTable).set({ name, phone, logo })
      .where(eq(companiesTable.id, companyId)).returning();

    return res.json({
      id: updated.id, name: updated.name, phone: updated.phone,
      email: updated.email, logo: updated.logo,
      subscriptionPlan: updated.subscriptionPlan, createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;

    const [totalEmployeesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable).where(eq(employeesTable.companyId, companyId));

    const [totalDevicesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(devicesTable).where(eq(devicesTable.companyId, companyId));

    const todayAttendance = await db.select().from(attendanceTable).where(
      and(eq(attendanceTable.companyId, companyId), sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`)
    );

    const totalEmployees = totalEmployeesResult?.count ?? 0;
    const totalDevices = totalDevicesResult?.count ?? 0;
    const presentToday = todayAttendance.length;
    const absentToday = Math.max(0, totalEmployees - presentToday);
    const lateToday = todayAttendance.filter(a => (a.lateMinutes || 0) > 0).length;
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return res.json({ totalEmployees, presentToday, absentToday, lateToday, totalDevices, attendanceRate });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
