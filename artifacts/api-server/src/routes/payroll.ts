import { Router, type IRouter } from "express";
import { db, payrollTable, attendanceTable, employeesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { month, year, employee_id } = req.query;

    const conditions: any[] = [eq(payrollTable.companyId, companyId)];
    if (month) conditions.push(eq(payrollTable.month, parseInt(month as string)));
    if (year) conditions.push(eq(payrollTable.year, parseInt(year as string)));
    if (employee_id) conditions.push(eq(payrollTable.employeeId, parseInt(employee_id as string)));

    const records = await db.select().from(payrollTable)
      .where(and(...conditions))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month));

    const withEmployees = await Promise.all(records.map(async (r) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
      return formatPayroll(r, emp);
    }));

    const totalAmount = withEmployees.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    return res.json({ data: withEmployees, total: withEmployees.length, totalAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/calculate", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: "validation_error", message: "month and year required" });

    const employees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, companyId));
    const results = [];

    for (const emp of employees) {
      const attendanceRecords = await db.select().from(attendanceTable).where(
        and(
          eq(attendanceTable.employeeId, emp.id),
          eq(attendanceTable.companyId, companyId),
          sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${year}`,
        )
      );

      const totalHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours ? parseFloat(a.workHours.toString()) : 0), 0);
      const totalDays = attendanceRecords.filter(a => a.checkIn).length;

      let grossSalary = 0;
      if (emp.salaryType === "hourly" && emp.hourlyRate) {
        grossSalary = totalHours * parseFloat(emp.hourlyRate.toString());
      } else if (emp.salaryType === "monthly" && emp.monthlySalary) {
        const workingDaysInMonth = 22;
        grossSalary = (parseFloat(emp.monthlySalary.toString()) / workingDaysInMonth) * totalDays;
      }

      const [existing] = await db.select().from(payrollTable).where(
        and(eq(payrollTable.employeeId, emp.id), eq(payrollTable.companyId, companyId),
          eq(payrollTable.month, month), eq(payrollTable.year, year))
      );

      let payrollRecord;
      if (existing) {
        const [updated] = await db.update(payrollTable)
          .set({ totalHours: totalHours.toFixed(2), totalDays, grossSalary: grossSalary.toFixed(2) })
          .where(eq(payrollTable.id, existing.id)).returning();
        payrollRecord = updated;
      } else {
        const [created] = await db.insert(payrollTable).values({
          employeeId: emp.id, companyId, month, year,
          totalHours: totalHours.toFixed(2), totalDays, grossSalary: grossSalary.toFixed(2),
        }).returning();
        payrollRecord = created;
      }

      results.push(formatPayroll(payrollRecord, emp));
    }

    const totalAmount = results.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    return res.json({ data: results, total: results.length, totalAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

function formatEmployee(e: any) {
  return {
    id: e.id, companyId: e.companyId, fullName: e.fullName, phone: e.phone, position: e.position,
    salaryType: e.salaryType,
    hourlyRate: e.hourlyRate ? parseFloat(e.hourlyRate) : null,
    monthlySalary: e.monthlySalary ? parseFloat(e.monthlySalary) : null,
    qrCode: e.qrCode, telegramId: e.telegramId, createdAt: e.createdAt,
  };
}

function formatPayroll(p: any, emp: any) {
  return {
    id: p.id, employeeId: p.employeeId, companyId: p.companyId,
    month: p.month, year: p.year,
    totalHours: p.totalHours ? parseFloat(p.totalHours) : 0,
    totalDays: p.totalDays || 0,
    grossSalary: p.grossSalary ? parseFloat(p.grossSalary) : 0,
    employee: emp ? formatEmployee(emp) : null,
    createdAt: p.createdAt,
  };
}

export default router;
