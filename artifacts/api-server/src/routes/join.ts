import { Router, type IRouter } from "express";
import { db, companiesTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const { joinCode, phone } = req.body;
    if (!joinCode || !phone) {
      return res.status(400).json({ error: "validation_error", message: "joinCode va phone talab qilinadi" });
    }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.joinCode, joinCode.toUpperCase()));
    if (!company) {
      return res.status(404).json({ error: "not_found", message: "Bunday kompaniya kodi topilmadi" });
    }

    const normalizedPhone = phone.replace(/\s/g, "");
    const [employee] = await db.select().from(employeesTable).where(
      and(eq(employeesTable.companyId, company.id), eq(employeesTable.phone, normalizedPhone))
    );

    if (!employee) {
      return res.status(404).json({ error: "not_found", message: "Bu telefon raqam kompaniyada topilmadi. Administratoringizga murojaat qiling." });
    }

    return res.json({
      success: true,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        position: employee.position,
        phone: employee.phone,
      },
      company: {
        id: company.id,
        name: company.name,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", message: "Server xatosi" });
  }
});

router.get("/company/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const [company] = await db.select({
      id: companiesTable.id,
      name: companiesTable.name,
      joinCode: companiesTable.joinCode,
    }).from(companiesTable).where(eq(companiesTable.joinCode, code));

    if (!company) {
      return res.status(404).json({ error: "not_found", message: "Kompaniya topilmadi" });
    }

    return res.json(company);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
