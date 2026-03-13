import { Router, type IRouter } from "express";
import { db, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import QRCode from "qrcode";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { search, position, page = "1", limit = "20" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const employees = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId))
      .orderBy(desc(employeesTable.createdAt));

    const filtered = employees.filter((e) => {
      if (search && !e.fullName.toLowerCase().includes((search as string).toLowerCase()) &&
          !e.phone.includes(search as string)) return false;
      if (position && e.position !== position) return false;
      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      data: paginated.map(formatEmployee),
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { fullName, phone, position, salaryType, hourlyRate, monthlySalary, telegramId, departmentId } = req.body;

    const [employee] = await db.insert(employeesTable).values({
      companyId,
      fullName,
      phone,
      position,
      salaryType: salaryType || "monthly",
      hourlyRate: hourlyRate?.toString(),
      monthlySalary: monthlySalary?.toString(),
      telegramId: telegramId || null,
      departmentId: departmentId ? parseInt(departmentId) : null,
    }).returning();

    const qrData = JSON.stringify({ employee_id: employee.id, company_id: companyId, name: employee.fullName });
    const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });

    const [updated] = await db.update(employeesTable)
      .set({ qrCode })
      .where(eq(employeesTable.id, employee.id))
      .returning();

    return res.status(201).json(formatEmployee(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/all-qr", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { departmentId } = req.query;

    let query = db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId))
      .$dynamic();

    if (departmentId) {
      query = query.where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.departmentId, parseInt(departmentId as string))));
    }

    const employees = await query.orderBy(employeesTable.fullName);

    const withQr = await Promise.all(
      employees.map(async (emp) => {
        let qrCode = emp.qrCode;
        if (!qrCode) {
          const qrData = JSON.stringify({ employee_id: emp.id, company_id: companyId, name: emp.fullName });
          qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });
          await db.update(employeesTable).set({ qrCode }).where(eq(employeesTable.id, emp.id));
        }
        return { ...formatEmployee({ ...emp, qrCode }), position: emp.position };
      })
    );

    return res.json(withQr);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);

    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));

    if (!employee) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json(formatEmployee(employee));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { fullName, phone, position, salaryType, hourlyRate, monthlySalary, telegramId, departmentId } = req.body;

    const [existing] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));

    if (!existing) {
      return res.status(404).json({ error: "not_found" });
    }

    const [updated] = await db.update(employeesTable)
      .set({
        fullName: fullName ?? existing.fullName,
        phone: phone ?? existing.phone,
        position: position ?? existing.position,
        salaryType: salaryType ?? existing.salaryType,
        hourlyRate: hourlyRate?.toString() ?? existing.hourlyRate,
        monthlySalary: monthlySalary?.toString() ?? existing.monthlySalary,
        telegramId: telegramId ?? existing.telegramId,
        departmentId: departmentId !== undefined ? (departmentId ? parseInt(departmentId) : null) : existing.departmentId,
      })
      .where(eq(employeesTable.id, id))
      .returning();

    return res.json(formatEmployee(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);

    const [existing] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));

    if (!existing) {
      return res.status(404).json({ error: "not_found" });
    }

    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/qr", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);

    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));

    if (!employee) {
      return res.status(404).json({ error: "not_found" });
    }

    let qrCode = employee.qrCode;
    if (!qrCode) {
      const qrData = JSON.stringify({ employee_id: employee.id, company_id: companyId, name: employee.fullName });
      qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });
      await db.update(employeesTable).set({ qrCode }).where(eq(employeesTable.id, id));
    }

    return res.json({ qrCode, employeeId: id, fullName: employee.fullName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

function formatEmployee(e: any) {
  return {
    id: e.id,
    companyId: e.companyId,
    fullName: e.fullName,
    phone: e.phone,
    position: e.position,
    salaryType: e.salaryType,
    hourlyRate: e.hourlyRate ? parseFloat(e.hourlyRate) : null,
    monthlySalary: e.monthlySalary ? parseFloat(e.monthlySalary) : null,
    qrCode: e.qrCode,
    telegramId: e.telegramId,
    departmentId: e.departmentId,
    createdAt: e.createdAt,
  };
}

export default router;
