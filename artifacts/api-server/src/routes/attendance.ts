import { Router, type IRouter } from "express";
import { db, attendanceTable, employeesTable, companiesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram-bot";

function calcLateMinutes(checkIn: Date, workStartTime: string, thresholdMinutes: number): number {
  const [h, m] = workStartTime.split(":").map(Number);
  const start = new Date(checkIn);
  start.setHours(h, m, 0, 0);
  const diffMs = checkIn.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  return diffMin > thresholdMinutes ? diffMin : 0;
}

const router: IRouter = Router();

router.post("/scan", async (req, res) => {
  try {
    const { qrData, deviceId, photo } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: "invalid_qr", message: "QR data required" });
    }

    let parsed: { employee_id: number; company_id: number };
    try {
      parsed = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
    } catch {
      return res.status(400).json({ error: "invalid_qr", message: "Invalid QR code format" });
    }

    const { employee_id, company_id } = parsed;

    const employee = await db.query.employeesTable.findFirst({
      where: and(
        eq(employeesTable.id, employee_id),
        eq(employeesTable.companyId, company_id),
      ),
    });

    if (!employee) {
      return res.status(404).json({ error: "not_found", message: "Employee not found" });
    }

    const todayRecord = await db.query.attendanceTable.findFirst({
      where: and(
        eq(attendanceTable.employeeId, employee_id),
        eq(attendanceTable.companyId, company_id),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      ),
    });

    const now = new Date();

    const company = await db.query.companiesTable.findFirst({
      where: eq(companiesTable.id, company_id),
    });
    const workStart = company?.workStartTime || "09:00";
    const threshold = parseInt(company?.lateThresholdMinutes || "15");

    if (!todayRecord) {
      const lateMinutes = calcLateMinutes(now, workStart, threshold);
      const status = lateMinutes > 0 ? "late" : "present";

      const [newRecord] = await db.insert(attendanceTable).values({
        employeeId: employee_id,
        companyId: company_id,
        checkIn: now,
        lateMinutes,
        status,
        deviceId: deviceId || null,
      }).returning();

      if (employee.telegramId) {
        const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
        const lateText = lateMinutes > 0 ? `\n⚠️ Kechikish: <b>${lateMinutes} daqiqa</b>` : "";
        await sendTelegramMessage(
          employee.telegramId,
          `✅ <b>Ishga keldingiz!</b>\n\n👤 ${employee.fullName}\n🕐 Kelish vaqti: <b>${formatTime(now)}</b>\n📅 Sana: ${date}${lateText}`
        ).catch(() => {});
      }

      return res.json({
        action: "check_in",
        employee: formatEmployee(employee),
        attendance: formatAttendance(newRecord, employee),
        message: `${employee.fullName} checked in at ${formatTime(now)}${lateMinutes > 0 ? ` (${lateMinutes} min late)` : ""}`,
        lateMinutes,
      });
    } else if (!todayRecord.checkOut) {
      const checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : now;
      const workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const [updated] = await db.update(attendanceTable)
        .set({
          checkOut: now,
          workHours: workHours.toFixed(2),
        })
        .where(eq(attendanceTable.id, todayRecord.id))
        .returning();

      if (employee.telegramId) {
        const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
        await sendTelegramMessage(
          employee.telegramId,
          `🏁 <b>Ish yakunlandi!</b>\n\n👤 ${employee.fullName}\n🕐 Ketish vaqti: <b>${formatTime(now)}</b>\n⏱ Ishlagan vaqt: <b>${workHours.toFixed(1)} soat</b>\n📅 Sana: ${date}`
        ).catch(() => {});
      }

      return res.json({
        action: "check_out",
        employee: formatEmployee(employee),
        attendance: formatAttendance(updated, employee),
        message: `${employee.fullName} checked out at ${formatTime(now)}. Worked ${workHours.toFixed(1)} hours`,
      });
    } else {
      return res.json({
        action: "check_out",
        employee: formatEmployee(employee),
        attendance: formatAttendance(todayRecord, employee),
        message: `${employee.fullName} already checked out today`,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.get("/today", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;

    const records = await db.query.attendanceTable.findMany({
      where: and(
        eq(attendanceTable.companyId, companyId),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      ),
      with: { employeesTable: true } as any,
      orderBy: (att, { desc }) => [desc(att.checkIn)],
    });

    const withEmployees = await Promise.all(records.map(async (r) => {
      const emp = await db.query.employeesTable.findFirst({
        where: eq(employeesTable.id, r.employeeId),
      });
      return formatAttendance(r, emp!);
    }));

    return res.json({
      data: withEmployees,
      total: withEmployees.length,
      page: 1,
      limit: withEmployees.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    const companyId = session.companyId;
    const { employee_id, date_from, date_to, page = "1", limit = "20" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(attendanceTable.companyId, companyId)];

    if (employee_id) {
      conditions.push(eq(attendanceTable.employeeId, parseInt(employee_id as string)));
    }
    if (date_from) {
      conditions.push(gte(attendanceTable.createdAt, new Date(date_from as string)));
    }
    if (date_to) {
      const dateTo = new Date(date_to as string);
      dateTo.setHours(23, 59, 59, 999);
      conditions.push(lte(attendanceTable.createdAt, dateTo));
    }

    const records = await db.query.attendanceTable.findMany({
      where: and(...conditions),
      limit: limitNum,
      offset,
      orderBy: (att, { desc }) => [desc(att.createdAt)],
    });

    const withEmployees = await Promise.all(records.map(async (r) => {
      const emp = await db.query.employeesTable.findFirst({
        where: eq(employeesTable.id, r.employeeId),
      });
      return formatAttendance(r, emp!);
    }));

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceTable)
      .where(and(...conditions));

    return res.json({
      data: withEmployees,
      total: countResult?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
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
    createdAt: e.createdAt,
  };
}

function formatAttendance(a: any, employee: any) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    companyId: a.companyId,
    checkIn: a.checkIn,
    checkOut: a.checkOut,
    workHours: a.workHours ? parseFloat(a.workHours) : null,
    deviceId: a.deviceId,
    createdAt: a.createdAt,
    employee: employee ? formatEmployee(employee) : null,
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

export default router;
