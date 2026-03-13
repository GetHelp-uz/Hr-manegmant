import { Router, type IRouter } from "express";
import { db, employeesTable, attendanceTable, leaveRequestsTable, advanceRequestsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { employee_id, company_id } = req.query;
    if (!employee_id || !company_id) {
      return res.status(400).json({ error: "employee_id and company_id required" });
    }

    const empId = parseInt(employee_id as string);
    const compId = parseInt(company_id as string);

    const [employee] = await db.select().from(employeesTable).where(
      and(eq(employeesTable.id, empId), eq(employeesTable.companyId, compId))
    );
    if (!employee) return res.status(404).json({ error: "not_found" });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const attendanceThisMonth = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.employeeId, empId),
        sql`${attendanceTable.createdAt} >= ${monthStart}`,
        sql`${attendanceTable.createdAt} <= ${monthEnd}`
      )
    ).orderBy(desc(attendanceTable.createdAt));

    const todayRecord = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.employeeId, empId),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      )
    );

    const leaveRequests = await db.select().from(leaveRequestsTable).where(
      eq(leaveRequestsTable.employeeId, empId)
    ).orderBy(desc(leaveRequestsTable.createdAt)).limit(10);

    const advances = await db.select().from(advanceRequestsTable).where(
      eq(advanceRequestsTable.employeeId, empId)
    ).orderBy(desc(advanceRequestsTable.createdAt)).limit(10);

    const presentDays = attendanceThisMonth.filter(a => a.status === "present" || a.status === "late").length;
    const lateDays = attendanceThisMonth.filter(a => a.status === "late").length;
    const totalHours = attendanceThisMonth.reduce((sum, a) => sum + (a.workHours ? parseFloat(a.workHours.toString()) : 0), 0);

    return res.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        phone: employee.phone,
        position: employee.position,
        salaryType: employee.salaryType,
        monthlySalary: employee.monthlySalary ? parseFloat(employee.monthlySalary.toString()) : null,
        hourlyRate: employee.hourlyRate ? parseFloat(employee.hourlyRate.toString()) : null,
        status: employee.status,
        employeeCode: employee.employeeCode,
        createdAt: employee.createdAt,
      },
      stats: {
        presentDays,
        lateDays,
        totalHours: Math.round(totalHours * 10) / 10,
        month,
        year,
      },
      todayAttendance: todayRecord[0] || null,
      recentAttendance: attendanceThisMonth.slice(0, 20).map(a => ({
        id: a.id,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        workHours: a.workHours ? parseFloat(a.workHours.toString()) : null,
        lateMinutes: a.lateMinutes || 0,
        status: a.status,
        createdAt: a.createdAt,
      })),
      leaveRequests: leaveRequests.map(l => ({
        id: l.id,
        type: l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        reason: l.reason,
        status: l.status,
        adminNote: l.adminNote,
        createdAt: l.createdAt,
      })),
      advances: advances.map(a => ({
        id: a.id,
        amount: a.amount ? parseFloat(a.amount.toString()) : 0,
        reason: a.reason,
        status: a.status,
        adminNote: (a as any).adminNote || null,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
