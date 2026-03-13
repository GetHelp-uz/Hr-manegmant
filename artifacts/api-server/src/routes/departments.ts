import { Router, type IRouter } from "express";
import { db, departmentsTable, employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;

    const departments = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.companyId, companyId))
      .orderBy(departmentsTable.name);

    const result = await Promise.all(
      departments.map(async (dept) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(employeesTable)
          .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.departmentId, dept.id)));
        return { ...dept, employeeCount: count };
      })
    );

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, description, baseSalaryType, baseMonthlySalary, baseHourlyRate } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const [dept] = await db.insert(departmentsTable).values({
      companyId,
      name,
      description: description || null,
      baseSalaryType: baseSalaryType || "monthly",
      baseMonthlySalary: baseMonthlySalary ? baseMonthlySalary.toString() : null,
      baseHourlyRate: baseHourlyRate ? baseHourlyRate.toString() : null,
    }).returning();

    return res.json({ ...dept, employeeCount: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const deptId = parseInt(req.params.id);
    const { name, description, baseSalaryType, baseMonthlySalary, baseHourlyRate } = req.body;

    const [updated] = await db.update(departmentsTable)
      .set({
        name,
        description: description || null,
        baseSalaryType,
        baseMonthlySalary: baseMonthlySalary ? baseMonthlySalary.toString() : null,
        baseHourlyRate: baseHourlyRate ? baseHourlyRate.toString() : null,
      })
      .where(and(eq(departmentsTable.id, deptId), eq(departmentsTable.companyId, companyId)))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/apply-salary", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const deptId = parseInt(req.params.id);

    const [dept] = await db
      .select()
      .from(departmentsTable)
      .where(and(eq(departmentsTable.id, deptId), eq(departmentsTable.companyId, companyId)));

    if (!dept) return res.status(404).json({ error: "Department not found" });

    const updateData: any = { salaryType: dept.baseSalaryType };
    if (dept.baseSalaryType === "monthly") {
      updateData.monthlySalary = dept.baseMonthlySalary;
      updateData.hourlyRate = null;
    } else {
      updateData.hourlyRate = dept.baseHourlyRate;
      updateData.monthlySalary = null;
    }

    await db.update(employeesTable)
      .set(updateData)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.departmentId, deptId)));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.departmentId, deptId)));

    return res.json({ updated: count, department: dept });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const deptId = parseInt(req.params.id);

    await db.update(employeesTable)
      .set({ departmentId: null })
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.departmentId, deptId)));

    await db.delete(departmentsTable)
      .where(and(eq(departmentsTable.id, deptId), eq(departmentsTable.companyId, companyId)));

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
