import { Router, type IRouter } from "express";
import { db, departmentsTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const departments = await db.query.departmentsTable.findMany({
      where: eq(departmentsTable.companyId, companyId),
      orderBy: (d, { asc }) => [asc(d.name)],
    });

    const result = await Promise.all(
      departments.map(async (dept) => {
        const employees = await db.query.employeesTable.findMany({
          where: and(
            eq(employeesTable.companyId, companyId),
            eq(employeesTable.departmentId, dept.id)
          ),
        });
        return { ...dept, employeeCount: employees.length };
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
      description,
      baseSalaryType: baseSalaryType || "monthly",
      baseMonthlySalary: baseMonthlySalary || null,
      baseHourlyRate: baseHourlyRate || null,
    }).returning();

    return res.json(dept);
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
      .set({ name, description, baseSalaryType, baseMonthlySalary, baseHourlyRate })
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

    const dept = await db.query.departmentsTable.findFirst({
      where: and(eq(departmentsTable.id, deptId), eq(departmentsTable.companyId, companyId)),
    });
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

    const employees = await db.query.employeesTable.findMany({
      where: and(eq(employeesTable.companyId, companyId), eq(employeesTable.departmentId, deptId)),
    });

    return res.json({ updated: employees.length, department: dept });
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
