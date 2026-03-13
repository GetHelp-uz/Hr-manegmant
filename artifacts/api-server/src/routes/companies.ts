import { Router, type IRouter } from "express";
import { db, companiesTable, employeesTable, devicesTable, attendanceTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const company = await db.query.companiesTable.findFirst({
      where: eq(companiesTable.id, session.companyId),
    });

    if (!company) {
      return res.status(404).json({ error: "not_found", message: "Company not found" });
    }

    return res.json({
      id: company.id,
      name: company.name,
      phone: company.phone,
      email: company.email,
      logo: company.logo,
      subscriptionPlan: company.subscriptionPlan,
      createdAt: company.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const { name, phone, logo } = req.body;

    const [updated] = await db.update(companiesTable)
      .set({ name, phone, logo })
      .where(eq(companiesTable.id, session.companyId))
      .returning();

    return res.json({
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      logo: updated.logo,
      subscriptionPlan: updated.subscriptionPlan,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEmployeesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId));

    const [totalDevicesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(devicesTable)
      .where(eq(devicesTable.companyId, companyId));

    const todayAttendance = await db.query.attendanceTable.findMany({
      where: and(
        eq(attendanceTable.companyId, companyId),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      ),
    });

    const totalEmployees = totalEmployeesResult?.count ?? 0;
    const totalDevices = totalDevicesResult?.count ?? 0;
    const presentToday = todayAttendance.length;
    const absentToday = Math.max(0, totalEmployees - presentToday);

    const lateToday = todayAttendance.filter((a) => {
      if (!a.checkIn) return false;
      const checkIn = new Date(a.checkIn);
      return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
    }).length;

    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return res.json({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      totalDevices,
      attendanceRate,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
