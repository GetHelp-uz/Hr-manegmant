import { Router, type IRouter } from "express";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/attendance-summary", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

    const employees = await db.query.employeesTable.findMany({
      where: eq(employeesTable.companyId, companyId),
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = Math.floor(daysInMonth * (5 / 7));

    const summaries = await Promise.all(employees.map(async (emp) => {
      const attendanceRecords = await db.query.attendanceTable.findMany({
        where: and(
          eq(attendanceTable.employeeId, emp.id),
          eq(attendanceTable.companyId, companyId),
          sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${year}`,
        ),
      });

      const presentDays = attendanceRecords.filter(a => a.checkIn).length;
      const absentDays = Math.max(0, workingDays - presentDays);

      const lateDays = attendanceRecords.filter(a => {
        if (!a.checkIn) return false;
        const checkIn = new Date(a.checkIn);
        return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
      }).length;

      const totalHours = attendanceRecords.reduce((sum, a) => {
        return sum + (a.workHours ? parseFloat(a.workHours.toString()) : 0);
      }, 0);

      const checkInTimes = attendanceRecords
        .filter(a => a.checkIn)
        .map(a => {
          const d = new Date(a.checkIn!);
          return d.getHours() * 60 + d.getMinutes();
        });

      let avgArrivalTime = null;
      if (checkInTimes.length > 0) {
        const avgMinutes = Math.floor(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length);
        const h = Math.floor(avgMinutes / 60).toString().padStart(2, "0");
        const m = (avgMinutes % 60).toString().padStart(2, "0");
        avgArrivalTime = `${h}:${m}`;
      }

      return {
        employee: {
          id: emp.id,
          companyId: emp.companyId,
          fullName: emp.fullName,
          phone: emp.phone,
          position: emp.position,
          salaryType: emp.salaryType,
          hourlyRate: emp.hourlyRate ? parseFloat(emp.hourlyRate.toString()) : null,
          monthlySalary: emp.monthlySalary ? parseFloat(emp.monthlySalary.toString()) : null,
          qrCode: emp.qrCode,
          telegramId: emp.telegramId,
          createdAt: emp.createdAt,
        },
        presentDays,
        absentDays,
        lateDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        avgArrivalTime,
      };
    }));

    return res.json({ month, year, employeeSummaries: summaries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
