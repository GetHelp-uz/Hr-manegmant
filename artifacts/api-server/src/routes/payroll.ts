import { Router, type IRouter } from "express";
import { db, payrollTable, attendanceTable, employeesTable, adminsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, requireAccountant } from "../middlewares/auth";

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
      let approver = null, payer = null;
      if (r.approvedBy) {
        const [a] = await db.select({ id: adminsTable.id, name: adminsTable.name }).from(adminsTable).where(eq(adminsTable.id, r.approvedBy));
        approver = a || null;
      }
      if (r.paidBy) {
        const [p] = await db.select({ id: adminsTable.id, name: adminsTable.name }).from(adminsTable).where(eq(adminsTable.id, r.paidBy));
        payer = p || null;
      }
      return formatPayroll(r, emp, approver, payer);
    }));

    const totalAmount = withEmployees.reduce((sum, p) => sum + (p.netSalary || p.grossSalary || 0), 0);
    return res.json({ data: withEmployees, total: withEmployees.length, totalAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/calculate", requireAdmin, async (req, res) => {
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
      const salaryType = emp.salaryType || "monthly";

      if (salaryType === "hourly" && emp.hourlyRate) {
        grossSalary = totalHours * parseFloat(emp.hourlyRate.toString());
      } else if (salaryType === "monthly" && emp.monthlySalary) {
        const workingDaysInMonth = 22;
        grossSalary = (parseFloat(emp.monthlySalary.toString()) / workingDaysInMonth) * totalDays;
      } else if (salaryType === "daily" && emp.dailyRate) {
        grossSalary = totalDays * parseFloat(emp.dailyRate.toString());
      } else if (salaryType === "piecerate") {
        grossSalary = 0;
      }

      const [existing] = await db.select().from(payrollTable).where(
        and(eq(payrollTable.employeeId, emp.id), eq(payrollTable.companyId, companyId),
          eq(payrollTable.month, month), eq(payrollTable.year, year))
      );

      let payrollRecord;
      const netSalary = grossSalary;

      if (existing) {
        if (existing.status === "paid") {
          results.push(formatPayroll(existing, emp, null, null));
          continue;
        }
        const [updated] = await db.update(payrollTable)
          .set({
            totalHours: totalHours.toFixed(2),
            totalDays,
            grossSalary: grossSalary.toFixed(2),
            netSalary: netSalary.toFixed(2),
            status: "draft"
          })
          .where(eq(payrollTable.id, existing.id)).returning();
        payrollRecord = updated;
      } else {
        const [created] = await db.insert(payrollTable).values({
          employeeId: emp.id, companyId, month, year,
          totalHours: totalHours.toFixed(2), totalDays,
          grossSalary: grossSalary.toFixed(2),
          netSalary: netSalary.toFixed(2),
          bonusAmount: "0", deductions: "0",
          totalPieces: 0,
          status: "draft",
        }).returning();
        payrollRecord = created;
      }

      results.push(formatPayroll(payrollRecord, emp, null, null));
    }

    const totalAmount = results.reduce((sum, p) => sum + (p.netSalary || p.grossSalary || 0), 0);
    return res.json({ data: results, total: results.length, totalAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.patch("/:id/pieces", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { totalPieces, bonusAmount, deductions } = req.body;

    const [existing] = await db.select().from(payrollTable).where(and(
      eq(payrollTable.id, id), eq(payrollTable.companyId, companyId)
    ));
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.status === "paid") return res.status(400).json({ error: "bad_request", message: "Cannot edit paid payroll" });

    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, existing.employeeId));

    let grossSalary = parseFloat(existing.grossSalary?.toString() || "0");
    let bonus = parseFloat(bonusAmount?.toString() || existing.bonusAmount?.toString() || "0");
    const deductionAmt = parseFloat(deductions?.toString() || existing.deductions?.toString() || "0");

    if (emp?.salaryType === "piecerate" && emp?.pieceRate && totalPieces !== undefined) {
      const pieces = parseInt(totalPieces);
      const rate = parseFloat(emp.pieceRate.toString());
      const plan = emp.pieceRatePlan || 0;
      const bonusPct = parseFloat(emp.bonusPercent?.toString() || "0");

      if (plan > 0 && pieces > plan) {
        const basePieces = plan;
        const overPieces = pieces - plan;
        grossSalary = basePieces * rate + overPieces * rate;
        bonus = overPieces * rate * (bonusPct / 100);
      } else {
        grossSalary = pieces * rate;
        bonus = 0;
      }
    }

    const netSalary = grossSalary + bonus - deductionAmt;

    const [updated] = await db.update(payrollTable).set({
      totalPieces: totalPieces !== undefined ? parseInt(totalPieces) : existing.totalPieces,
      grossSalary: grossSalary.toFixed(2),
      bonusAmount: bonus.toFixed(2),
      deductions: deductionAmt.toFixed(2),
      netSalary: netSalary.toFixed(2),
    }).where(eq(payrollTable.id, id)).returning();

    return res.json({ data: formatPayroll(updated, emp, null, null) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.patch("/:id/approve", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const adminId = (req.session as any).adminId;
    const id = parseInt(req.params.id);
    const { notes } = req.body;

    const [existing] = await db.select().from(payrollTable).where(and(
      eq(payrollTable.id, id), eq(payrollTable.companyId, companyId),
    ));
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.status === "paid") return res.status(400).json({ error: "bad_request", message: "Already paid" });

    const [updated] = await db.update(payrollTable).set({
      status: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      notes: notes || existing.notes,
    }).where(eq(payrollTable.id, id)).returning();

    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, updated.employeeId));
    const [approver] = await db.select({ id: adminsTable.id, name: adminsTable.name }).from(adminsTable).where(eq(adminsTable.id, adminId));
    return res.json({ data: formatPayroll(updated, emp, approver, null) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.patch("/:id/pay", requireAccountant, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const adminId = (req.session as any).adminId;
    const id = parseInt(req.params.id);
    const { notes } = req.body;

    const [existing] = await db.select().from(payrollTable).where(and(
      eq(payrollTable.id, id), eq(payrollTable.companyId, companyId),
    ));
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.status !== "approved") {
      return res.status(400).json({ error: "bad_request", message: "Payroll must be approved by admin first" });
    }

    const [updated] = await db.update(payrollTable).set({
      status: "paid",
      paidBy: adminId,
      paidAt: new Date(),
      notes: notes || existing.notes,
    }).where(eq(payrollTable.id, id)).returning();

    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, updated.employeeId));
    let approver = null;
    if (updated.approvedBy) {
      const [a] = await db.select({ id: adminsTable.id, name: adminsTable.name }).from(adminsTable).where(eq(adminsTable.id, updated.approvedBy));
      approver = a || null;
    }
    const [payer] = await db.select({ id: adminsTable.id, name: adminsTable.name }).from(adminsTable).where(eq(adminsTable.id, adminId));
    return res.json({ data: formatPayroll(updated, emp, approver, payer) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(payrollTable).where(and(
      eq(payrollTable.id, id), eq(payrollTable.companyId, companyId),
    ));
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.status === "paid") return res.status(400).json({ error: "bad_request", message: "Cannot delete paid payroll" });
    await db.delete(payrollTable).where(eq(payrollTable.id, id));
    return res.json({ success: true });
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
    dailyRate: e.dailyRate ? parseFloat(e.dailyRate) : null,
    pieceRate: e.pieceRate ? parseFloat(e.pieceRate) : null,
    pieceRatePlan: e.pieceRatePlan || 0,
    bonusPercent: e.bonusPercent ? parseFloat(e.bonusPercent) : 0,
    qrCode: e.qrCode, telegramId: e.telegramId, createdAt: e.createdAt,
  };
}

function formatPayroll(p: any, emp: any, approver: any, payer: any) {
  return {
    id: p.id, employeeId: p.employeeId, companyId: p.companyId,
    month: p.month, year: p.year,
    totalHours: p.totalHours ? parseFloat(p.totalHours) : 0,
    totalDays: p.totalDays || 0,
    totalPieces: p.totalPieces || 0,
    grossSalary: p.grossSalary ? parseFloat(p.grossSalary) : 0,
    bonusAmount: p.bonusAmount ? parseFloat(p.bonusAmount) : 0,
    deductions: p.deductions ? parseFloat(p.deductions) : 0,
    netSalary: p.netSalary ? parseFloat(p.netSalary) : (p.grossSalary ? parseFloat(p.grossSalary) : 0),
    status: p.status || "draft",
    approvedBy: approver,
    approvedAt: p.approvedAt,
    paidBy: payer,
    paidAt: p.paidAt,
    notes: p.notes,
    employee: emp ? formatEmployee(emp) : null,
    createdAt: p.createdAt,
  };
}

export default router;
