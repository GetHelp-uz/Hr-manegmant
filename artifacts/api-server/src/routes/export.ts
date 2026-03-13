import { Router, type IRouter } from "express";
import { db, payrollTable, employeesTable, attendanceTable, companiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/payroll", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { month, year, format = "1c" } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "validation_error", message: "month and year required" });
    }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));

    const records = await db.select().from(payrollTable)
      .where(and(
        eq(payrollTable.companyId, companyId),
        eq(payrollTable.month, parseInt(month as string)),
        eq(payrollTable.year, parseInt(year as string)),
      ));

    const withEmployees = await Promise.all(records.map(async (r) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
      return { ...r, employee: emp };
    }));

    const monthNames = ["", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
      "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    const monthName = monthNames[parseInt(month as string)] || month;

    if (format === "1c") {
      const lines: string[] = [];
      lines.push(`[Шапка]`);
      lines.push(`Номер=ВЕД-${year}-${String(month).padStart(2, "0")}`);
      lines.push(`Дата=${new Date().toLocaleDateString("ru")}`);
      lines.push(`Организация=${company?.name || ""}`);
      lines.push(`Месяц=${month}`);
      lines.push(`Год=${year}`);
      lines.push(`КоличествоСтрок=${withEmployees.length}`);
      lines.push(``);
      lines.push(`[Сотрудники]`);
      withEmployees.forEach((r, i) => {
        lines.push(`Сотрудник${i + 1}=${r.employee?.fullName || ""}`);
        lines.push(`ДнейОтработано${i + 1}=${r.totalDays}`);
        lines.push(`ЧасовОтработано${i + 1}=${r.totalHours}`);
        lines.push(`НачисленоЗарплаты${i + 1}=${parseFloat(r.grossSalary?.toString() || "0").toFixed(2)}`);
        lines.push(`Бонус${i + 1}=${parseFloat(r.bonusAmount?.toString() || "0").toFixed(2)}`);
        lines.push(`Вычеты${i + 1}=${parseFloat(r.deductions?.toString() || "0").toFixed(2)}`);
        lines.push(`КВыплате${i + 1}=${parseFloat(r.netSalary?.toString() || "0").toFixed(2)}`);
        lines.push(`Статус${i + 1}=${r.status === "paid" ? "Выплачено" : r.status === "approved" ? "Утверждено" : "Черновик"}`);
        lines.push(``);
      });

      const content = lines.join("\r\n");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="1C_Zarplata_${year}_${month}.txt"`);
      return res.send(Buffer.from(content, "utf-8"));
    }

    if (format === "bitrix") {
      const headers = ["ФИО", "Должность", "Отдел", "Дней", "Часов", "Начислено", "Бонус", "Вычеты", "К выплате", "Статус"];
      const csvRows = [headers.join(";")];
      withEmployees.forEach(r => {
        csvRows.push([
          r.employee?.fullName || "",
          r.employee?.position || "",
          "",
          r.totalDays,
          r.totalHours,
          parseFloat(r.grossSalary?.toString() || "0").toFixed(2),
          parseFloat(r.bonusAmount?.toString() || "0").toFixed(2),
          parseFloat(r.deductions?.toString() || "0").toFixed(2),
          parseFloat(r.netSalary?.toString() || "0").toFixed(2),
          r.status,
        ].map(v => `"${v}"`).join(";"));
      });

      const content = "\uFEFF" + csvRows.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="Bitrix_Zarplata_${year}_${month}.csv"`);
      return res.send(Buffer.from(content, "utf-8"));
    }

    if (format === "uzasbo") {
      const lines: string[] = [];
      lines.push(`UZASBO EXPORT v1.0`);
      lines.push(`Kompaniya: ${company?.name || ""}`);
      lines.push(`Davr: ${monthName} ${year}`);
      lines.push(`Sana: ${new Date().toLocaleDateString("uz")}`);
      lines.push(`Jami xodimlar: ${withEmployees.length}`);
      lines.push(`-`.repeat(80));
      lines.push(`${"T/R".padEnd(5)} ${"Ism Familya".padEnd(30)} ${"Kun".padEnd(5)} ${"Soat".padEnd(7)} ${"Maosh".padEnd(15)} ${"Bonus".padEnd(12)} ${"Jami"}`);
      lines.push(`-`.repeat(80));
      withEmployees.forEach((r, i) => {
        const name = (r.employee?.fullName || "").substring(0, 28).padEnd(30);
        const days = String(r.totalDays).padEnd(5);
        const hours = String(parseFloat(r.totalHours?.toString() || "0").toFixed(1)).padEnd(7);
        const gross = String(parseFloat(r.grossSalary?.toString() || "0").toLocaleString()).padEnd(15);
        const bonus = String(parseFloat(r.bonusAmount?.toString() || "0").toLocaleString()).padEnd(12);
        const net = String(parseFloat(r.netSalary?.toString() || "0").toLocaleString());
        lines.push(`${String(i + 1).padEnd(5)} ${name} ${days} ${hours} ${gross} ${bonus} ${net}`);
      });
      lines.push(`-`.repeat(80));
      const total = withEmployees.reduce((s, r) => s + parseFloat(r.netSalary?.toString() || "0"), 0);
      lines.push(`${"JAMI".padEnd(48)} ${total.toLocaleString()} so'm`);
      lines.push(`-`.repeat(80));

      const content = lines.join("\n");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="UzASBO_${year}_${month}.txt"`);
      return res.send(Buffer.from(content, "utf-8"));
    }

    if (format === "excel") {
      const headers = ["T/R", "Ism Familya", "Lavozim", "Ish kunlari", "Ish soatlari", "Dona soni", "Hisoblangan maosh", "Bonus", "Ushlamalar", "Jami to'lov", "Holat"];
      const csvRows = [headers.join(",")];
      withEmployees.forEach((r, i) => {
        csvRows.push([
          i + 1,
          `"${r.employee?.fullName || ""}"`,
          `"${r.employee?.position || ""}"`,
          r.totalDays,
          parseFloat(r.totalHours?.toString() || "0").toFixed(1),
          r.totalPieces || 0,
          parseFloat(r.grossSalary?.toString() || "0").toFixed(0),
          parseFloat(r.bonusAmount?.toString() || "0").toFixed(0),
          parseFloat(r.deductions?.toString() || "0").toFixed(0),
          parseFloat(r.netSalary?.toString() || "0").toFixed(0),
          `"${r.status === "paid" ? "To'langan" : r.status === "approved" ? "Tasdiqlangan" : "Qoralama"}"`,
        ].join(","));
      });

      const total = withEmployees.reduce((s, r) => s + parseFloat(r.netSalary?.toString() || "0"), 0);
      csvRows.push(`"","","","","","","","","","${total.toFixed(0)}",""`);

      const content = "\uFEFF" + csvRows.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="Maosh_${year}_${month}.csv"`);
      return res.send(Buffer.from(content, "utf-8"));
    }

    return res.status(400).json({ error: "invalid_format", message: "format must be 1c|bitrix|uzasbo|excel" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/attendance", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { month, year, format = "excel" } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "validation_error", message: "month and year required" });
    }

    const records = await db.select().from(attendanceTable)
      .where(and(
        eq(attendanceTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${parseInt(month as string)}`,
        sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${parseInt(year as string)}`,
      ));

    const withEmployees = await Promise.all(records.map(async (r) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
      return { ...r, employee: emp };
    }));

    const headers = ["Sana", "Ism Familya", "Lavozim", "Kelish", "Ketish", "Ish soatlari", "Kechikdi", "Selfie"];
    const csvRows = [headers.join(",")];
    withEmployees.forEach(r => {
      csvRows.push([
        `"${r.createdAt ? new Date(r.createdAt).toLocaleDateString("uz") : ""}"`,
        `"${r.employee?.fullName || ""}"`,
        `"${r.employee?.position || ""}"`,
        `"${r.checkIn ? new Date(r.checkIn).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" }) : "-"}"`,
        `"${r.checkOut ? new Date(r.checkOut).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" }) : "-"}"`,
        parseFloat(r.workHours?.toString() || "0").toFixed(1),
        r.isLate ? "Ha" : "Yo'q",
        r.selfiePhoto ? "Bor" : "Yo'q",
      ].join(","));
    });

    const content = "\uFEFF" + csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="Davomat_${year}_${month}.csv"`);
    return res.send(Buffer.from(content, "utf-8"));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
