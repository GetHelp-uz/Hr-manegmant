import { Router, type IRouter } from "express";
import { db, employeesTable, departmentsTable, companiesTable } from "@workspace/db";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramPhoto, sendTelegramMessage, getBotUsername } from "../lib/telegram-bot";
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

async function generateUniqueEmployeeCode(): Promise<string> {
  for (let attempts = 0; attempts < 20; attempts++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const [existing] = await db.select({ id: employeesTable.id })
      .from(employeesTable)
      .where(eq(employeesTable.employeeCode, code));
    if (!existing) return code;
  }
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { fullName, phone, position, salaryType, hourlyRate, monthlySalary, telegramId, departmentId } = req.body;

    const employeeCode = await generateUniqueEmployeeCode();

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
      employeeCode,
    }).returning();

    const deepLink = `https://t.me/${getBotUsername()}?start=emp_${employee.id}`;
    const qrCode = await QRCode.toDataURL(deepLink, { width: 300, margin: 1 });

    const [updated] = await db.update(employeesTable)
      .set({ qrCode })
      .where(eq(employeesTable.id, employee.id))
      .returning();

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (company?.telegramAdminId) {
      const caption =
        `👤 <b>Yangi xodim qo'shildi!</b>\n\n` +
        `📝 Ism: <b>${employee.fullName}</b>\n` +
        `💼 Lavozim: ${employee.position || "—"}\n` +
        `📱 Telefon: ${employee.phone}\n` +
        `🔢 Xodim kodi: <b>${employeeCode}</b>\n\n` +
        `📲 Bot orqali davomat uchun xodim o'z kodini botga yuboring: <code>${employeeCode}</code>\n` +
        `🔲 Yoki QR kodni skanerlang.`;
      await sendTelegramPhoto(company.telegramAdminId, qrCode, caption).catch(() => {});
    }

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

router.get("/:id/telegram-qr", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);

    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));

    if (!employee) return res.status(404).json({ error: "not_found" });

    const deepLink = `https://t.me/${getBotUsername()}?start=emp_${employee.id}`;
    const telegramQr = await QRCode.toDataURL(deepLink, { width: 350, margin: 2 });

    return res.json({ qrCode: telegramQr, deepLink, employeeId: id, fullName: employee.fullName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/regenerate-qr", requireAuth, async (req, res) => {
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

    const qrData = JSON.stringify({ employee_id: employee.id, company_id: companyId, name: employee.fullName });
    const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });
    await db.update(employeesTable).set({ qrCode }).where(eq(employeesTable.id, id));

    return res.json({ qrCode, employeeId: id, fullName: employee.fullName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/face-descriptors", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const employees = await db.select().from(employeesTable).where(
      and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active"))
    );
    const withFace = employees
      .filter((e) => e.faceDescriptor)
      .map((e) => ({
        id: e.id,
        fullName: e.fullName,
        descriptor: JSON.parse(e.faceDescriptor!),
      }));
    return res.json({ data: withFace });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/face-descriptors-public/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    if (!companyId) return res.status(400).json({ error: "invalid" });
    const employees = await db.select().from(employeesTable).where(
      and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active"))
    );
    const withFace = employees
      .filter((e) => e.faceDescriptor)
      .map((e) => ({
        id: e.id,
        fullName: e.fullName,
        descriptor: JSON.parse(e.faceDescriptor!),
      }));
    return res.json({ data: withFace });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/enroll-face", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: "invalid_descriptor", message: "Yuz tasviri noto'g'ri" });
    }
    const [employee] = await db.select().from(employeesTable).where(
      and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId))
    );
    if (!employee) return res.status(404).json({ error: "not_found" });

    await db.update(employeesTable)
      .set({ faceDescriptor: JSON.stringify(Array.from(descriptor)) })
      .where(eq(employeesTable.id, id));

    return res.json({ success: true, message: "Yuz muvaffaqiyatli ro'yxatdan o'tkazildi" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id/enroll-face", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    await db.update(employeesTable)
      .set({ faceDescriptor: null })
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    return res.json({ success: true });
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
    employeeCode: e.employeeCode || null,
    qrCode: e.qrCode,
    hasFace: Boolean(e.faceDescriptor),
    telegramId: e.telegramId,
    departmentId: e.departmentId,
    status: e.status,
    createdAt: e.createdAt,
  };
}

export default router;
